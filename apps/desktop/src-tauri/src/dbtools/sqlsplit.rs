//! Port of apps/web/src/lib/sql-split.ts — split SQL on the top-level
//! statement terminator only, honoring quotes, comments, Postgres
//! dollar-quoted bodies, and MySQL's `DELIMITER` client directive.

/// True when `needle` starts at `chars[i]`.
fn matches_at(chars: &[char], i: usize, needle: &str) -> bool {
    let n: Vec<char> = needle.chars().collect();
    i + n.len() <= chars.len() && chars[i..i + n.len()] == n[..]
}

/// Recognises a `DELIMITER <token>` line at `chars[i]`. It is a client
/// directive, not SQL: without it a `CREATE PROCEDURE` body splits on its own
/// internal semicolons and every fragment fails. Returns the new terminator
/// and the index just past the directive's line.
fn parse_delimiter(chars: &[char], i: usize) -> Option<(String, usize)> {
    const KEYWORD: &[u8] = b"delimiter";
    if i + KEYWORD.len() >= chars.len() {
        return None;
    }
    for (k, expected) in KEYWORD.iter().enumerate() {
        if !chars[i + k].eq_ignore_ascii_case(&(*expected as char)) {
            return None;
        }
    }
    let mut j = i + KEYWORD.len();
    // The keyword must be followed by a space, or this is an identifier that
    // merely starts with "delimiter".
    if !matches!(chars.get(j), Some(' ') | Some('\t')) {
        return None;
    }
    while matches!(chars.get(j), Some(' ') | Some('\t')) {
        j += 1;
    }
    let start = j;
    while j < chars.len() && !chars[j].is_whitespace() {
        j += 1;
    }
    if start == j {
        return None;
    }
    let token: String = chars[start..j].iter().collect();
    // Swallow the rest of the line, newline included.
    while j < chars.len() && chars[j] != '\n' {
        j += 1;
    }
    if j < chars.len() {
        j += 1;
    }
    Some((token, j))
}

pub fn split_sql_statements(sql: &str) -> Vec<String> {
    let chars: Vec<char> = sql.chars().collect();
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut delimiter = String::from(";");
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
            Mode::Normal => {
                // Only at a statement boundary — `DELIMITER` mid-statement is
                // an identifier, not a directive.
                if current.trim().is_empty() {
                    if let Some((token, resume)) = parse_delimiter(&chars, i) {
                        delimiter = token;
                        current = String::new();
                        i = resume;
                        continue;
                    }
                }
                if matches_at(&chars, i, &delimiter) {
                    let stmt = current.trim().to_string();
                    if !stmt.is_empty() {
                        statements.push(stmt);
                    }
                    current = String::new();
                    i += delimiter.chars().count();
                    continue;
                }
                match c {
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
                    _ => current.push(c),
                }
            }
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

    #[test]
    fn delimiter_directive_keeps_a_procedure_body_whole() {
        let sql = "DELIMITER //\n\
                   CREATE PROCEDURE p()\n\
                   BEGIN\n\
                     SELECT 1;\n\
                     SELECT 2;\n\
                   END //\n\
                   DELIMITER ;\n\
                   SELECT 3;";
        let parts = split_sql_statements(sql);
        assert_eq!(parts.len(), 2, "got {parts:?}");
        assert!(parts[0].starts_with("CREATE PROCEDURE"));
        assert!(parts[0].contains("SELECT 1;"));
        assert!(parts[0].contains("SELECT 2;"));
        assert_eq!(parts[1], "SELECT 3");
    }

    #[test]
    fn delimiter_directive_is_never_emitted_as_a_statement() {
        let parts = split_sql_statements("DELIMITER //\nSELECT 1 //");
        assert_eq!(parts, vec!["SELECT 1"]);
    }

    #[test]
    fn delimiter_is_a_directive_only_at_a_statement_boundary() {
        // A column called `delimiter` must not be mistaken for the directive.
        let parts = split_sql_statements("SELECT delimiter x FROM t; SELECT 2");
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0], "SELECT delimiter x FROM t");
    }
}
