import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const githubApi = path => JSON.parse(execFileSync("gh", ["api", path], {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));

export async function publishedBase(repository, request = githubApi) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || "")) return "";
  const read = path => request(`repos/${repository}/${path}`);
  try {
    const deployments = await read("deployments?environment=github-pages&per_page=10");
    for (const deployment of deployments) {
      if (!Number.isSafeInteger(deployment.id) || !/^[a-f0-9]{40}$/i.test(deployment.sha || "")) continue;
      const statuses = await read(`deployments/${deployment.id}/statuses`);
      if (statuses[0]?.state === "success") return deployment.sha;
    }
  } catch { /* An unknown published base retains the full gate. */ }
  return "";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(await publishedBase(process.env.GITHUB_REPOSITORY));
}
