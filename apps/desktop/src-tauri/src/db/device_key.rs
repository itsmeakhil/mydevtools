use keyring::Entry;

use crate::error::Result;

const SERVICE: &str = "tech.mydevtools.desktop";
const ACCOUNT: &str = "db-key";

/// Remove the device key from the Keychain. NoEntry counts as success so a
/// retried factory reset stays idempotent.
pub fn delete() -> Result<()> {
    match Entry::new(SERVICE, ACCOUNT)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.into()),
    }
}

/// Returns the 32-byte SQLCipher key as lowercase hex, creating and storing it
/// in the macOS Keychain on first run.
pub fn get_or_create() -> Result<String> {
    let entry = Entry::new(SERVICE, ACCOUNT)?;
    match entry.get_password() {
        Ok(key) => Ok(key),
        Err(keyring::Error::NoEntry) => {
            let mut bytes = [0u8; 32];
            getrandom::fill(&mut bytes).expect("OS entropy source unavailable");
            let key: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
            entry.set_password(&key)?;
            Ok(key)
        }
        Err(e) => Err(e.into()),
    }
}
