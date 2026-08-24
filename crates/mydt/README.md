# mydt

Reference implementation of the MyDevTools `.mydt` encrypted file format
(Argon2id + XChaCha20-Poly1305, self-contained per file) and a small CLI.
Format spec: [`docs/MYDT_FORMAT.md`](../../docs/MYDT_FORMAT.md).

The desktop app's Secure Files tool uses this crate unchanged, so anything the
CLI writes opens in the app and vice versa.

## Library

```rust
let params = mydt::KdfParams::generate();               // random salt, default costs
let kek = mydt::derive_kek(b"password", &params)?;      // Argon2id, once per salt
let meta = mydt::FileMeta { name: "a.env".into(), dir: "".into(), size: 3, mtime: 0, imported_at: 0 };
let object = mydt::encrypt_file(&kek, &params, &meta, b"x=1")?;

let params = mydt::kdf_params(&object)?;                // read salt/costs back
let (meta, plaintext) = mydt::decrypt_file(&kek, &params.salt, &object)?;
```

## CLI

```sh
cargo install --path . --features cli        # or: cargo build --release --features cli

export MYDT_PASSWORD=...                      # otherwise prompted
mydt encrypt secrets.env --dir proj/config    # prints <32 hex>.mydt
mydt encrypt a.pem --params-from ~/SecureFiles/<any>.mydt -o ~/SecureFiles/new.mydt
mydt info   <file>.mydt [--unlock]
mydt ls     ~/SecureFiles
mydt decrypt <file>.mydt [-o out | -o -]
```

`--params-from` copies another object's salt and KDF parameters, which is what
makes a CLI-written file a member of an existing Secure Files storage folder.
Without it a fresh random salt is used and the desktop app will report the file
as belonging to another vault.

## Tests

`cargo test` — round trips, tamper/truncation/garbage sweep, wrong key, foreign
salt, 20 MiB payload, nonce freshness.
