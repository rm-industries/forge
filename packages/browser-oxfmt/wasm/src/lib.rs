mod formatter;
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub fn format(source: &str, options: &str) -> Result<String, JsValue> {
    formatter::run(source.as_bytes(), options.as_bytes()).map_err(|error| JsValue::from_str(&error))
}
