async function test() {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/proxy-cabinet?url=https://example.com');
    const text = await res.text();
    console.log("RESPONSE:", text);
  } catch(e) {
    console.error("FAIL", e);
  }
}
test();
