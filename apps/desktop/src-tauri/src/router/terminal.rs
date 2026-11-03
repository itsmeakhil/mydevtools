//! `/api/v1/terminal/state`: opaque JSON blob owned by the Terminal UI, stored in `kv`.

use rusqlite::OptionalExtension;
use serde_json::{json, Value};

use crate::error::Result;
use crate::router::ApiResponse;
use crate::state::AppState;

const KV_KEY: &str = "terminal:state";

pub fn handle(state: &AppState, method: &str, rest: &str, body: Option<&str>) -> Result<ApiResponse> {
    if rest != "/state" {
        return Ok(ApiResponse::detail(404, "Not found"));
    }
    let db = state.db.lock().unwrap();
    match method {
        "GET" => {
            let raw: Option<String> = db
                .query_row("SELECT v FROM kv WHERE k = ?1", [KV_KEY], |r| r.get(0))
                .optional()?;
            match raw {
                Some(v) => Ok(ApiResponse { status: 200, body: v }),
                None => ApiResponse::ok(&json!({ "projects": [], "activeProjectId": null })),
            }
        }
        "PUT" => {
            match body.and_then(|b| serde_json::from_str::<Value>(b).ok()) {
                Some(v) if v.is_object() => {
                    db.execute(
                        "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
                        [KV_KEY, &serde_json::to_string(&v)?],
                    )?;
                    ApiResponse::ok(&v)
                }
                _ => Ok(ApiResponse::detail(400, "Body must be a JSON object")),
            }
        }
        _ => Ok(ApiResponse::detail(405, "Method not allowed")),
    }
}

#[cfg(test)]
mod tests {
    use crate::router::route;
    use crate::state::AppState;

    #[test]
    fn get_default_when_empty() {
        let s = AppState::in_memory();
        let r = route(&s, "GET", "/api/v1/terminal/state", None).unwrap();
        assert_eq!(r.status, 200);
        let v: serde_json::Value = serde_json::from_str(&r.body).unwrap();
        assert_eq!(v, serde_json::json!({"projects": [], "activeProjectId": null}));
    }

    #[test]
    fn put_then_get_roundtrip() {
        let s = AppState::in_memory();
        let body = r#"{"projects":[{"id":"p1"}],"activeProjectId":"p1"}"#;
        assert_eq!(route(&s, "PUT", "/api/v1/terminal/state", Some(body)).unwrap().status, 200);
        let r = route(&s, "GET", "/api/v1/terminal/state", None).unwrap();
        let v: serde_json::Value = serde_json::from_str(&r.body).unwrap();
        assert_eq!(v["activeProjectId"], "p1");
        assert_eq!(v["projects"][0]["id"], "p1");
    }

    #[test]
    fn put_rejects_non_object() {
        let s = AppState::in_memory();
        for b in ["[1]", "\"x\"", "null", "nope"] {
            assert_eq!(route(&s, "PUT", "/api/v1/terminal/state", Some(b)).unwrap().status, 400);
        }
        assert_eq!(route(&s, "PUT", "/api/v1/terminal/state", None).unwrap().status, 400);
    }
}
