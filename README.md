# 🚀 Playwright Test Automation Framework

## Introduction

This repository contains a robust **Playwright Automation Framework** built using **Playwright**, **TypeScript**, and **Axios**. It is designed for comprehensive **UI**, **API**, and **Database** testing with a strong emphasis on **scalability**, **security**, and **maintainability**.

---

## 🧰 Getting Started

Ensure **Node.js** is installed, then install project dependencies:

```bash
npm install
```

---

## ⚙️ Environment Setup

Before running tests, configure your environment and encryption settings.

### 1. Set Environment Variables

Copy the example file for your desired environment:

```bash
cp envs/.env.uat.example envs/.env.uat
```

Edit `envs/.env.uat` with valid credentials:

```env
PORTAL_USERNAME=your.username
PORTAL_PASSWORD=your.password
```

> ℹ️ **Do not edit the root `.env` file.** It is auto-managed.

---

## 🔐 Encryption Setup

The framework uses **AES-GCM** for encryption and **Argon2** for secure hashing of sensitive credentials.

### 🔧 CLI Utilities

#### Generate Secret Key

```bash
npx cross-env PLAYWRIGHT_GREP=@generate-key npm run test:encryption:uat
```

#### Encrypt Credentials

```bash
npx cross-env PLAYWRIGHT_GREP=@encrypt npm run test:encryption:uat
```

> 💡 Replace `uat` with your target environment (`dev`, `prod`, etc.).

> ⚠️ **Always generate a new secret key before encrypting credentials.**

---

## 🧪 Running Tests

Execute tests by type and environment using these scripts:

| Command                   | Description               |
| ------------------------- | ------------------------- |
| `npm run test:ui:dev`     | Run UI tests in DEV       |
| `npm run test:api:dev`    | Run API tests in DEV      |
| `npm run test:db:dev`     | Run DB tests in DEV       |
| `npm run test:all:dev`    | Run all test types in DEV |
| `npm run test:failed:dev` | Rerun failed tests in DEV |
| `npm run test:ui:uat`     | Run UI tests in UAT       |
| `npm run test:api:uat`    | Run API tests in UAT      |
| `npm run test:db:uat`     | Run DB tests in UAT       |
| `npm run test:all:uat`    | Run all test types in UAT |
| `npm run test:failed:uat` | Rerun failed tests in UAT |

---

## 🏷️ Running Tests by Tag

You can filter tests using Playwright's `grep` feature:

### Examples

| Command                                                              | Description                         |
| -------------------------------------------------------------------- | ----------------------------------- |
| `npx cross-env PLAYWRIGHT_GREP=sanity npm run test:api:dev`          | Run **sanity** API tests in DEV     |
| `npx cross-env PLAYWRIGHT_GREP=regression npm run test:api:dev`      | Run **regression** API tests in DEV |
| `npx cross-env PLAYWRIGHT_GREP=@encrypt npm run test:encryption:uat` | Encrypt credentials for UAT         |

---

## 🛠️ Developer Utilities

### Code Quality & Linting

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm run type:check`   | Type check using TypeScript                   |
| `npm run lint`         | Identify linting issues                       |
| `npm run lint:fix`     | Auto-fix lint issues                          |
| `npm run format`       | Format code using Prettier                    |
| `npm run format:check` | Check if code is correctly formatted          |
| `npm run spell`        | Run spell check using `cspell`                |
| `npm run quality`      | Run type check, lint, format check, and spell |

> ✅ All test commands run `npm run quality` beforehand via `pretest:*` hooks.

---

### Productivity Tools

| Command          | Description                         |
| ---------------- | ----------------------------------- |
| `npm run ui`     | Launch Playwright Test Runner UI    |
| `npm run record` | Start Playwright Code Generator     |
| `npm run report` | View HTML report from last test run |

---

## 📝 Notes

* ❌ **Never commit `.env` files** to version control.
* 🔐 **Always encrypt secrets** before use and regenerate keys on credential changes.
* 📦 Run `npm install` after switching branches or pulling updates.
* 🚀 CI/CD-ready and optimized for long-term use.
* 🔁 Cached authentication states speed up test execution.

---

## 🤝 Contribute

> ✨ *Coming soon!*

We welcome contributions. Contribution guidelines and issue templates will be added soon. Meanwhile, explore exemplary READMEs:

* [ASP.NET Core](https://github.com/aspnet/Home)
* [Visual Studio Code](https://github.com/Microsoft/vscode)
* [ChakraCore](https://github.com/Microsoft/ChakraCore)

---