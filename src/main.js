import chalk from "chalk";
import fs from "fs";
import ncp from "ncp";
import path from "path";
import { promisify } from "util";
import execa from "execa";
import Listr from "listr";
import { projectInstall } from "pkg-install";

const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false,
  });
}

async function initGit(options) {
  const result = await execa("git", ["init"], {
    cwd: options.targetDirectory,
  });
  if (result.failed) {
    return Promise.reject(new Error("Failed to initialize Git"));
  }
  return;
}

async function createFolder(options) {
  fs.mkdir(`${options.targetDirectory}`, { recursive: true }, (err) => {
    if (err) throw Error(err);
  });
}

export async function createProject(options) {
  options = {
    ...options,
    targetDirectory: `${process.cwd()}/${options.name}`,
  };
  console.log(options);
  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    "../../templates",
    options.template.toLowerCase()
  );

  options.templateDirectory = templateDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (error) {
    console.error("%s Invalid template name", chalk.red.bold("ERROR"));
    process.exit(1);
  }

  const tasks = new Listr([
    {
      title: "Create project folder",
      task: () => createFolder(options),
    },
    {
      title: "Copy project files",
      task: () => copyTemplateFiles(options),
    },
    {
      title: "Initialize git",
      task: () => initGit(options),
    },
    {
      title: "Install dependencies...",
      task: () =>
        projectInstall({
          cwd: options.targetDirectory,
        }),
    },
  ]);

  await tasks.run();

  console.log("%s Project ready", chalk.green.bold("DONE"));
  return true;
}
