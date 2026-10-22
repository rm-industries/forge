mod markdown_adapter;
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub fn format(source: &str, options: &str) -> Result<String, JsValue> {
    markdown_adapter::format_markdown(source.as_bytes(), options.as_bytes())
        .map_err(|error| JsValue::from_str(&error))
}
