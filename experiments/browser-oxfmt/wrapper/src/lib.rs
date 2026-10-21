// Throwaway feasibility probe. Raw ABI is for the controlled test harness only.
use oxc_allocator::Allocator;
use oxc_formatter_core::{DispatchResponse, FormatSession, InputKind, SessionServices};
use oxc_formatter_core::{IndentStyle, IndentWidth, LineEnding, LineWidth};
use oxc_formatter_markdown::{MarkdownFormatOptions, ProseWrap, SingleQuote};
use serde::Deserialize;
use std::sync::Arc;

#[link(wasm_import_module = "env")]
unsafe extern "C" {
    fn report_panic(ptr: *const u8, len: usize);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Options {
    #[serde(default)]
    sort_imports: bool,
    #[serde(default)]
    sort_tailwindcss: bool,
    #[serde(default)]
    sort_package_json: bool,
    #[serde(default)]
    trailing_comma: Option<String>,
    print_width: u16,
    tab_width: u8,
    single_quote: bool,
    prose_wrap: String,
    end_of_line: String,
    use_tabs: bool,
    embedded_language_formatting: String,
}

fn run(source: &[u8], options: &[u8]) -> Result<String, String> {
    let source = std::str::from_utf8(source).map_err(|error| error.to_string())?;
    let input: Options = serde_json::from_slice(options).map_err(|error| error.to_string())?;
    if input.embedded_language_formatting != "auto" {
        return Err("This probe requires embeddedLanguageFormatting: auto".into());
    }
    if input
        .trailing_comma
        .as_deref()
        .is_some_and(|value| value != "all")
    {
        return Err("This probe only supports trailingComma: all".into());
    }
    // Physical input is always Markdown; sortPackageJson only applies to package.json.
    let _ = input.sort_package_json;
    let options = MarkdownFormatOptions {
        indent_style: if input.use_tabs {
            IndentStyle::Tab
        } else {
            IndentStyle::Space
        },
        indent_width: IndentWidth::try_from(input.tab_width).map_err(|error| error.to_string())?,
        line_width: LineWidth::try_from(input.print_width).map_err(|error| error.to_string())?,
        line_ending: match input.end_of_line.as_str() {
            "lf" => LineEnding::Lf,
            "crlf" => LineEnding::Crlf,
            "cr" => LineEnding::Cr,
            _ => return Err("Unsupported endOfLine".into()),
        },
        prose_wrap: match input.prose_wrap.as_str() {
            "always" => ProseWrap::Always,
            "never" => ProseWrap::Never,
            "preserve" => ProseWrap::Preserve,
            _ => return Err("Unsupported proseWrap".into()),
        },
        single_quote: SingleQuote::from(input.single_quote),
    };
    let allocator = Allocator::new();
    let session = FormatSession::with_services(
        &allocator,
        InputKind::PhysicalFile,
        SessionServices {
            dispatcher: Some(Arc::new(move |session, request| {
                let result = match request.language {
                    "yaml" | "yml" => oxc_formatter_yaml::format_to_ir(
                        session,
                        request.text,
                        oxc_formatter_yaml::YamlFormatOptions {
                            indent_width: options.indent_width,
                            line_width: options.line_width,
                            line_ending: options.line_ending,
                            single_quote: input.single_quote.into(),
                            prose_wrap: match options.prose_wrap {
                                ProseWrap::Always => oxc_formatter_yaml::ProseWrap::Always,
                                ProseWrap::Never => oxc_formatter_yaml::ProseWrap::Never,
                                ProseWrap::Preserve => oxc_formatter_yaml::ProseWrap::Preserve,
                            },
                            ..Default::default()
                        },
                    )
                    .map_err(|e| e.to_string()),
                    "css" => oxc_formatter_css::format_to_ir(
                        session,
                        request.text,
                        oxc_formatter_css::CssFormatOptions {
                            indent_style: options.indent_style,
                            indent_width: options.indent_width,
                            line_width: options.line_width,
                            line_ending: options.line_ending,
                            single_quote: input.single_quote.into(),
                            sort_tailwindcss: input.sort_tailwindcss,
                            ..Default::default()
                        },
                        false,
                    )
                    .map_err(|e| e.to_string()),
                    "md" | "markdown" => {
                        oxc_formatter_markdown::format_to_ir(session, request.text, options, false)
                            .map_err(|e| e.to_string())
                    }
                    "ts" | "typescript" | "js" | "javascript" => {
                        let extension = if matches!(request.language, "ts" | "typescript") {
                            "ts"
                        } else {
                            "js"
                        };
                        oxc_formatter::format_to_ir(
                            session,
                            request.text,
                            oxc_span::SourceType::from_extension(extension).unwrap(),
                            oxc_formatter::JsFormatOptions {
                                indent_style: options.indent_style,
                                indent_width: options.indent_width,
                                line_width: options.line_width,
                                line_ending: options.line_ending,
                                sort_imports: input
                                    .sort_imports
                                    .then(oxc_formatter::SortImportsOptions::default),
                                quote_style: if input.single_quote {
                                    oxc_formatter::QuoteStyle::Single
                                } else {
                                    oxc_formatter::QuoteStyle::Double
                                },
                                ..Default::default()
                            },
                            Some(oxc_formatter::JsEmbeddedIn::MarkdownCodeBlock),
                        )
                        .map_err(|e| e.to_string())
                    }
                    _ => return Ok(DispatchResponse::PreserveOriginal),
                };
                Ok(match result {
                    Ok(ir) => DispatchResponse::Formatted(ir.into()),
                    Err(_) => DispatchResponse::PreserveOriginal,
                })
            })),
            ..Default::default()
        },
    );
    let formatted = oxc_formatter_markdown::format_with_session(&session, source, options)
        .map_err(|error| error.to_string())?;
    formatted
        .print()
        .map(|printed| printed.into_code())
        .map_err(|error| error.to_string())
}

#[unsafe(no_mangle)]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; len].into_boxed_slice()) as *mut u8
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn release(ptr: *mut u8, len: usize) {
    unsafe { drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len))) };
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn format(
    source: *const u8,
    source_len: usize,
    options: *const u8,
    options_len: usize,
) -> u64 {
    std::panic::set_hook(Box::new(|info| {
        let message = info.to_string();
        unsafe { report_panic(message.as_ptr(), message.len()) };
    }));
    let result = run(
        unsafe { std::slice::from_raw_parts(source, source_len) },
        unsafe { std::slice::from_raw_parts(options, options_len) },
    );
    let output = match result {
        Ok(code) => serde_json::json!({"code": code}),
        Err(error) => serde_json::json!({"error": error}),
    }
    .to_string()
    .into_bytes()
    .into_boxed_slice();
    let len = output.len();
    let ptr = Box::into_raw(output) as *mut u8;
    ((len as u64) << 32) | ptr as u64
}
