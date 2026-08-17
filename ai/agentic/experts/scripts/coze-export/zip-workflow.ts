import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";

const ZIP_ROOT = "workflow";

/**
 * 将磁盘上的专家 workflow 根目录打成 zip，内部路径为：
 * workflow/MANIFEST.yml、workflow/workflow/<*.yaml 等文件>。
 */
export function zipCozeWorkflowPackage(workflowDirAbs: string, zipFileAbs: string): void {
  const manifestPath = path.join(workflowDirAbs, "MANIFEST.yml");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`zip: 缺少 MANIFEST.yml: ${manifestPath}`);
  }
  const innerDir = path.join(workflowDirAbs, "workflow");
  if (!fs.existsSync(innerDir) || !fs.statSync(innerDir).isDirectory()) {
    throw new Error(`zip: 缺少内层 workflow 目录: ${innerDir}`);
  }

  const zip = new AdmZip();
  // adm-zip：第二参数为 zip 内目录前缀，会自动追加本地文件名
  zip.addLocalFile(manifestPath, ZIP_ROOT);

  for (const ent of fs.readdirSync(innerDir, { withFileTypes: true })) {
    if (!ent.isFile()) continue;
    zip.addLocalFile(path.join(innerDir, ent.name), `${ZIP_ROOT}/workflow`);
  }

  fs.mkdirSync(path.dirname(zipFileAbs), { recursive: true });
  zip.writeZip(zipFileAbs);
}
