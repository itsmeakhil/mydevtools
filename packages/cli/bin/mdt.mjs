#!/usr/bin/env node
import "../register.mjs"

const { main } = await import("../src/main.ts")
process.exitCode = await main(process.argv.slice(2))
