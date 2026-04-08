const { validate } = require("../src/validate");

const SIMPLE_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body><h1>Hello World</h1><button style="width:48px;height:48px">Click</button></body></html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html><head></head><body><script>throw new Error("test error");</script></body></html>`;

const SMALL_BUTTON_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body><h1>Hi</h1><button style="width:20px;height:20px;font-size:8px">x</button></body></html>`;

describe("validate", () => {
  jest.setTimeout(30000);

  test("passes valid HTML", async () => {
    const result = await validate(SIMPLE_HTML);
    expect(result.passed).toBe(true);
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "renders_without_error", passed: true }),
        expect.objectContaining({ name: "has_visible_content", passed: true }),
        expect.objectContaining({ name: "mobile_viewport", passed: true }),
      ])
    );
    expect(result.extracted_text).toContain("Hello World");
    expect(result.screenshot).toBeTruthy();
  });

  test("catches JS errors", async () => {
    const result = await validate(ERROR_HTML);
    const renderTest = result.results.find((r) => r.name === "renders_without_error");
    expect(renderTest.passed).toBe(false);
    expect(renderTest.error).toContain("test error");
  });

  test("catches small tap targets", async () => {
    const result = await validate(SMALL_BUTTON_HTML);
    const tapTest = result.results.find((r) => r.name === "tap_targets");
    expect(tapTest.passed).toBe(false);
  });
});
