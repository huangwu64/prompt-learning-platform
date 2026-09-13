package com.aiplatform.common.storage;

import com.aiplatform.common.BizException;
import com.aiplatform.common.util.IdGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Dimension;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;

/**
 * 本地磁盘文件存储（目前只用于头像）。
 *
 * 上传路径的安全要点，四条缺一不可：
 * 1. **魔数嗅探**判断真实格式 —— Content-Type 与扩展名都是客户端可伪造的
 * 2. **解码前先读图片头拿尺寸** —— 防止「2MB 的 PNG 解出上亿像素」把内存打爆
 * 3. **用 ImageIO 重新编码** —— 天然剥离 EXIF，并让伪装成图片的 polyglot 文件解码失败
 * 4. **文件名完全由服务端生成** —— 客户端文件名一律丢弃，杜绝路径穿越与注入
 */
@Slf4j
@Component
public class LocalFileStorage {

    /** 头像最大边长（像素）。前端 canvas 已预缩，这里是防绕过客户端的兜底 */
    private static final int MAX_DIMENSION = 512;

    /** 解码前的像素数上限，防解压炸弹 */
    private static final long MAX_PIXELS = 4096L * 4096L;

    /** 大小上限，与 spring.servlet.multipart.max-file-size 保持一致 */
    private static final long MAX_BYTES = 2L * 1024 * 1024;

    private static final String REL_AVATAR_DIR = "avatars";

    private final Path baseDir;
    private final String urlPrefix;

    public LocalFileStorage(@Value("${app.upload.dir:./uploads}") String uploadDir,
                            @Value("${app.upload.url-prefix:/uploads}") String urlPrefix) {
        this.baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.urlPrefix = urlPrefix.endsWith("/") ? urlPrefix.substring(0, urlPrefix.length() - 1) : urlPrefix;
        try {
            Files.createDirectories(baseDir);
        } catch (IOException e) {
            throw new IllegalStateException("无法创建上传根目录: " + baseDir, e);
        }
        log.info("文件上传根目录: {}", baseDir);
    }

    public Path getAvatarDir() {
        return baseDir.resolve(REL_AVATAR_DIR);
    }

    /**
     * 保存头像，返回可直接使用的外链路径，如
     * {@code /uploads/avatars/user_ab12cd34/av_9f8e7d6c5b4a.png}。
     */
    public String saveAvatar(String userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException(400, "请选择要上传的图片");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BizException(400, "头像不能超过 2MB");
        }

        byte[] raw;
        try (InputStream in = file.getInputStream()) {
            raw = in.readAllBytes();
        } catch (IOException e) {
            throw new BizException(400, "读取上传文件失败");
        }

        String format = sniffFormat(raw);
        BufferedImage image = decode(raw);
        BufferedImage normalized = downscaleIfNeeded(image);

        String owner = sanitize(userId);
        String filename = IdGenerator.generate("av") + ("png".equals(format) ? ".png" : ".jpg");

        Path dir = safeResolve(Path.of(REL_AVATAR_DIR, owner));
        Path target = safeResolve(Path.of(REL_AVATAR_DIR, owner, filename));

        try {
            Files.createDirectories(dir);
            // 用嗅探出的真实格式重编码，而不是听信客户端
            if (!ImageIO.write(normalized, "png".equals(format) ? "png" : "jpeg", target.toFile())) {
                throw new BizException(500, "图片保存失败，请稍后重试");
            }
        } catch (IOException e) {
            log.error("头像落盘失败 path={}: {}", target, e.getMessage());
            throw new BizException(500, "图片保存失败，请稍后重试");
        }

        return urlPrefix + "/" + REL_AVATAR_DIR + "/" + owner + "/" + filename;
    }

    /**
     * 删除某个已生效头像文件（审核通过新头像后清理旧文件）。
     * 只接受本服务生成的路径；不存在、非法路径都静默忽略 —— 清理失败不该影响主流程。
     */
    public void deleteAvatarQuietly(String url) {
        if (url == null || url.isBlank() || !url.startsWith(urlPrefix + "/")) {
            return;
        }
        try {
            Path target = safeResolve(Path.of(url.substring(urlPrefix.length() + 1)));
            Files.deleteIfExists(target);
        } catch (Exception e) {
            log.warn("旧头像清理失败 url={}: {}", url, e.getMessage());
        }
    }

    // ==================== 私有工具 ====================

    /** 按魔数判断真实格式。这是唯一可信的格式来源 */
    private String sniffFormat(byte[] data) {
        if (data.length >= 3
                && (data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return "jpeg";
        }
        if (data.length >= 4
                && (data[0] & 0xFF) == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G') {
            return "png";
        }
        throw new BizException(400, "只支持 JPEG / PNG 格式的图片");
    }

    /** 解码前先只读图片头拿尺寸，超限直接拒绝，避免为解压炸弹分配内存 */
    private BufferedImage decode(byte[] data) {
        Dimension size = readDimension(data);
        if ((long) size.width * size.height > MAX_PIXELS) {
            throw new BizException(400, "图片尺寸过大，请压缩后重试");
        }
        try (InputStream in = new ByteArrayInputStream(data)) {
            BufferedImage image = ImageIO.read(in);
            if (image == null) {
                // 魔数对但解不出图：很可能是伪装成图片的其他文件
                throw new BizException(400, "图片已损坏或格式不受支持");
            }
            return image;
        } catch (IOException e) {
            throw new BizException(400, "图片已损坏或格式不受支持");
        }
    }

    /** 只读头部拿宽高，不解码整张图 */
    private Dimension readDimension(byte[] data) {
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new BizException(400, "图片已损坏或格式不受支持");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(iis, true, true);
                return new Dimension(reader.getWidth(0), reader.getHeight(0));
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new BizException(400, "图片已损坏或格式不受支持");
        }
    }

    /** 超过上限则等比缩到上限内；不超过则原样返回 */
    private BufferedImage downscaleIfNeeded(BufferedImage image) {
        int w = image.getWidth();
        int h = image.getHeight();
        if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) {
            return image;
        }

        double ratio = Math.min((double) MAX_DIMENSION / w, (double) MAX_DIMENSION / h);
        int tw = Math.max(1, (int) Math.round(w * ratio));
        int th = Math.max(1, (int) Math.round(h * ratio));

        // 保留原图类型：PNG 带透明通道时用 ARGB，避免透明区域变黑
        int type = image.getType() == BufferedImage.TYPE_CUSTOM ? BufferedImage.TYPE_INT_ARGB : image.getType();
        BufferedImage scaled = new BufferedImage(tw, th, type);
        Graphics2D g = scaled.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(image, 0, 0, tw, th, null);
        } finally {
            g.dispose();
        }
        return scaled;
    }

    /** 解析到根目录内，越界即拒绝（防路径穿越） */
    private Path safeResolve(Path relative) {
        Path target = baseDir.resolve(relative).normalize();
        if (!target.startsWith(baseDir)) {
            throw new BizException(400, "非法的文件路径");
        }
        return target;
    }

    /** 目录名只保留字母数字下划线连字符 —— userId 虽是自产的，也不留注入余地 */
    private String sanitize(String value) {
        String cleaned = value == null ? "" : value.replaceAll("[^A-Za-z0-9_-]", "");
        if (cleaned.isEmpty()) {
            throw new BizException(400, "非法的用户标识");
        }
        return cleaned;
    }
}
