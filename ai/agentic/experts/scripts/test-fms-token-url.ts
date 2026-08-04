import * as assert from "assert";
import {
  buildFmsTokenUrl,
  signFmsUrlDeep,
  type FmsRuntimeConfig,
} from "../shared/fms-token-url";

const config: FmsRuntimeConfig = {
  US: {
    fmsUrl: "https://usfmsstream.winit.com.cn",
    clientId: "client-id-us",
    clientSecret: "client-secret-us",
    edsUser: "fms_us_user",
    edsToken: "fms-user-secret-us",
  },
};

const rawUrl =
  "https://usfmsstream.winit.com.cn/9966a6c526a3434285a048418390a8ff/2026/06/29/9374a16d98e54dbb8e9b5c7048772617.JPEG";
const expectedSignedUrl =
  "https://usfmsstream.winit.com.cn/9966a6c526a3434285a048418390a8ff/2026/06/29/9374a16d98e54dbb8e9b5c7048772617.JPEG?token=Lzk5NjZhNmM1MjZhMzQzNDI4NWEwNDg0MTgzOTBhOGZmLzIwMjYvMDYvMjkvOTM3NGExNmQ5OGU1NGRiYjhlOWI1YzcwNDg3NzI2MTcuSlBFRz9jbGllbnRTaWduPTQ3NDFENUFEMkMzMDQ2NDNDNkZGMUJEMjRGQ0Y0MUJFMDFFMTRDOTImdXNlclNpZ249NUQxODY3NkU3RjUxODc0Q0RGODg2QkI1M0U1NzA2QzdCN0QzNDI5QiZ2ZXJzaW9uPVYxLjAmZGF0ZT0xNzgyODkyODAwMDAwJnVzZXI9Zm1zX3VzX3VzZXImY2xpZW50SWQ9Y2xpZW50LWlkLXVz";

function testBuildFmsTokenUrl(): void {
  const signed = buildFmsTokenUrl(rawUrl, config, 1782892800000);
  assert.strictEqual(signed.status, "ok");
  assert.strictEqual(signed.region, "US");
  assert.strictEqual(signed.rawUrl, rawUrl);
  assert.strictEqual(signed.signedUrl, expectedSignedUrl);
}

function testSignFmsUrlDeep(): void {
  const input = {
    eventNo: "EB0126040628614246",
    attachmentList: [{ fileName: "photo.JPEG", fileUrl: rawUrl }],
    normalUrl: "https://example.com/not-fms.jpg",
  };

  const signed = signFmsUrlDeep(input, config, 1782892800000) as Record<string, unknown>;
  const attachment = (signed.attachmentList as Array<Record<string, unknown>>)[0]!;

  assert.strictEqual(attachment.fileUrl, rawUrl);
  assert.strictEqual(attachment.signedFileUrl, expectedSignedUrl);
  assert.strictEqual(signed.normalUrl, "https://example.com/not-fms.jpg");
}

testBuildFmsTokenUrl();
testSignFmsUrlDeep();
console.log("test-fms-token-url passed");
