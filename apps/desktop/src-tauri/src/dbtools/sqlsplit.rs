//! Port of apps/web/src/lib/sql-split.ts — split SQL on top-level `;` only,
//! honoring quotes, comments, and Postgres dollar-quoted bodies.

pub fn split_sql_statements(sql: &str) -> Vec<String> {
    let chars: Vec<char> = sql.chars().collect();
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut i = 0;

    #[derive(PartialEq)]
    enum Mode {
        Normal,
        Single,     // '...'
        Double,     // "..."
        Backtick,   // `...`
        LineComment,
        BlockComment,
        Dollar(String), // $tag$ ... $tag$
    }
    let mut mode = Mode::Normal;

    while i < chars.len() {
        let c = chars[i];
        let next = chars.get(i + 1).copied();
        match &mode {
            Mode::Normal => match c {
                '\'' => {
                    mode = Mode::Single;
                    current.push(c);
                }
                '"' => {
                    mode = Mode::Double;
                    current.push(c);
                }
                '`' => {
                    mode = Mode::Backtick;
                    current.push(c);
                }
                '-' if next == Some('-') => {
                    mode = Mode::LineComment;
                    current.push(c);
                }
                '/' if next == Some('*') => {
                    mode = Mode::BlockComment;
                    current.push(c);
                }
                '$' => {
                    // Possible dollar-quote open: $tag$ where tag is [A-Za-z0-9_]*
                    let mut j = i + 1;
                    while j < chars.len() && (chars[j].is_alphanumeric() || chars[j] == '_') {
                        j += 1;
                    }
                    if j < chars.len() && chars[j] == '$' {
                        let tag: String = chars[i..=j].iter().collect();
                        for k in i..=j {
                            current.push(chars[k]);
                        }
                        i = j;
                        mode = Mode::Dollar(tag);
                    } else {
                        current.push(c);
                    }
                }
                ';' => {
                    let stmt = current.trim().to_string();
                    if !stmt.is_empty() {
                        statements.push(stmt);
                    }
                    current = String::new();
                }
                _ => current.push(c),
            },
            Mode::Single => {
                current.push(c);
                if c == '\'' {
                    // '' escape stays inside the string
                    if next == Some('\'') {
                        current.push('\'');
                        i += 1;
                    } else {
                        mode = Mode::Normal;
                    }
                }
            }
            Mode::Double => {
                current.push(c);
                if c == '"' {
                    mode = Mode::Normal;
                }
            }
            Mode::Backtick => {
                current.push(c);
                if c == '`' {
                    mode = Mode::Normal;
                }
            }
            Mode::LineComment => {
                current.push(c);
                if c == '\n' {
                    mode = Mode::Normal;
                }
            }
            Mode::BlockComment => {
                current.push(c);
                if c == '*' && next == Some('/') {
                    current.push('/');
                    i += 1;
                    mode = Mode::Normal;
                }
            }
            Mode::Dollar(tag) => {
                if c == '$' {
                    let remaining: String = chars[i..].iter().take(tag.len()).collect();
                    if remaining == *tag {
                        for k in 0..tag.len() {
                            current.push(chars[i + k]);
                        }
                        i += tag.len() - 1;
                        mode = Mode::Normal;
                    } else {
                        current.push(c);
                    }
                } else {
                    current.push(c);
                }
            }
        }
        i += 1;
    }
    let stmt = current.trim().to_string();
    if !stmt.is_empty() {
        statements.push(stmt);
    }
    statements
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_on_top_level_semicolons_only() {
        let sql = "SELECT 'a;b'; -- c;\nSELECT $$x;y$$; SELECT 1";
        let parts = split_sql_statements(sql);
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "SELECT 'a;b'");
        assert!(parts[1].contains("$$x;y$$"));
        assert_eq!(parts[2], "SELECT 1");
    }

    #[test]
    fn dollar_tag_quotes() {
        let sql = "CREATE FUNCTION f() RETURNS int AS $fn$ BEGIN RETURN 1; END $fn$ LANGUAGE plpgsql; SELECT 2";
        let parts = split_sql_statements(sql);
        assert_eq!(parts.len(), 2);
        assert!(parts[0].contains("RETURN 1;"));
    }
}
