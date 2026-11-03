# MyDevTools Terminal: bash runs this via `--rcfile ... -i` instead of a login
# shell. Load what a login shell would, then the PATH fix and status hooks.
[ -r /etc/profile ] && . /etc/profile
_mdt_rc=
for _mdt_f in ~/.bash_profile ~/.bash_login ~/.profile; do
  if [ -r "$_mdt_f" ]; then
    . "$_mdt_f"
    # ponytail: textual check; a profile that loads .bashrc indirectly gets it twice.
    grep -qs bashrc "$_mdt_f" && _mdt_rc=1
    break
  fi
done
[ -z "$_mdt_rc" ] && [ -r ~/.bashrc ] && . ~/.bashrc
unset _mdt_f _mdt_rc

# Login files (path_helper, brew shellenv, ...) reorder PATH: put the claude shim first again.
if [ -n "$MDT_SHIM_DIR" ]; then
  IFS=: read -ra _mdt_a <<<"$PATH"
  PATH=$MDT_SHIM_DIR
  for _mdt_d in "${_mdt_a[@]}"; do
    [ "$_mdt_d" = "$MDT_SHIM_DIR" ] || PATH=$PATH:$_mdt_d
  done
  unset _mdt_a _mdt_d
fi

# Status hooks, backgrounded so the prompt never waits on the socket.
if [ -n "$MDT_HOOK_BIN" ]; then
  _mdt_prompt() {
    local s=$?
    ("$MDT_HOOK_BIN" shell-prompt </dev/null >/dev/null 2>&1 &)
    _mdt_ready=1
    return $s
  }
  _mdt_preexec() {
    [ -n "${_mdt_ready-}" ] && [ -z "${COMP_LINE-}" ] || return 0
    _mdt_ready=
    ("$MDT_HOOK_BIN" shell-exec </dev/null >/dev/null 2>&1 &)
  }
  PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND
}_mdt_prompt"
  # Leave an existing DEBUG trap (bash-preexec etc.) alone; only shell-exec is lost then.
  [ -z "$(trap -p DEBUG)" ] && trap '_mdt_preexec' DEBUG
fi
