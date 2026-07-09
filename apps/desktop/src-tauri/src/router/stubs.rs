//! Loud 501 for any unmapped path — gaps must be visible, never silent.

use crate::error::Result;
use crate::router::ApiResponse;

pub fn handle(method: &str, path: &str) -> Result<ApiResponse> {
    eprintln!("[local_api] 501 unmapped route: {method} {path}");
    Ok(ApiResponse::detail(
        501,
        &format!("Local route not implemented: {method} {path}"),
    ))
}
