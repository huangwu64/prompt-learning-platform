package com.aiplatform.common;

import lombok.Getter;

/**
 * 统一响应体：{success, data, error}
 */
@Getter
public class Result<T> {

    private final boolean success;
    private final T data;
    private final String error;

    private Result(boolean success, T data, String error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }

    public static <T> Result<T> ok(T data) {
        return new Result<>(true, data, null);
    }

    public static <T> Result<T> ok() {
        return new Result<>(true, null, null);
    }

    public static <T> Result<T> fail(String error) {
        return new Result<>(false, null, error);
    }
}
