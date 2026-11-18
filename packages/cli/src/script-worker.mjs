// Worker-thread entry: module hooks are per thread, so register them again here.
import "../register.mjs"
await import("./script-host.ts")
