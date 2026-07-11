use keyring::Entry;
use rand::RngCore;

use crate::error::Result;

const SERVICE: &str = "tech.mydevtools.desktop";
const ACCOUNT: &str = "db-key";

/// Returns the 32-byte SQLCipher key as lowercase hex, creating and storing it
/// in the macOS Keychain on first run.
pub fn get_or_create() -> Result<String> {
    let entry = Entry::new(SERVICE, ACCOUNT)?;
    match entry.get_password() {
        Ok(key) => Ok(key),
        Err(keyring::Error::NoEntry) => {
            let mut bytes = [0u8; 32];
            rand::rngs::OsRng.fill_bytes(&mut bytes);
            let key: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
            entry.set_password(&key)?;
            Ok(key)
        }
        Err(e) => Err(e.into()),
    }
}
