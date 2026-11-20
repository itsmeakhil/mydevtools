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

# Prompt marks and cwd, written in-band so the app reads them in output order:
# OSC 133 A = prompt (idle), B = end of prompt, C = command started (running), D;<exit> = it ended,
# OSC 7 = directory.
# Our hooks run first and last around the user's PROMPT_COMMAND. "Command started"
# (C) comes from PS0 on bash >= 4.4, which bash prints once per command line you
# type and never for prompt hooks; older bash uses a DEBUG trap that reports the
# first command after a prompt. `$_` is carried across our hooks (the bash-preexec
# technique) so `mkdir d && cd $_` keeps working.
_mdt_prompt_start() {
  local s=$?
  printf '\e]133;D;%s\a' "$s"
  _mdt_ready=
  [ $# -gt 0 ] && _mdt_last=$1
  return $s
}
_mdt_prompt() {
  local s=$? p=${PWD//\%/%25}
  printf '\e]7;file://%s%s\a\e]133;A\a' "$HOSTNAME" "${p// /%20}"
  # B = end of prompt, where typed input starts. Re-added each time: themes rebuild PS1
  # in their own PROMPT_COMMAND entries, which run before this one.
  [[ $PS1 == *'133;B'* ]] || PS1+='\[\e]133;B\a\]'
  _mdt_ready=1
  : "$_mdt_last"
  return $s
}
_mdt_preexec() {
  local a=$1
  case $BASH_COMMAND in
    _mdt_prompt_start*) _mdt_last=$a ;;
    _mdt_prompt*) ;;
    *)
      if [ -n "${_mdt_ready-}" ] && [ -z "${COMP_LINE-}" ]; then
        _mdt_ready=
        printf '\e]133;C\a'
      fi
      ;;
  esac
  : "$a"
}
_mdt_last=
if [ "${BASH_VERSINFO[0]}" -gt 5 ] || { [ "${BASH_VERSINFO[0]}" -eq 5 ] && [ "${BASH_VERSINFO[1]}" -ge 1 ]; }; then
  # bash >= 5.1 runs every PROMPT_COMMAND array element; a profile may already use the
  # array form, so ours go in as the first and last elements (nothing runs after A).
  PROMPT_COMMAND=('_mdt_prompt_start "$_"' "${PROMPT_COMMAND[@]}" _mdt_prompt)
else
  PROMPT_COMMAND="_mdt_prompt_start \"\$_\"${PROMPT_COMMAND:+
$PROMPT_COMMAND}
_mdt_prompt"
fi
if [ "${BASH_VERSINFO[0]}" -gt 4 ] || { [ "${BASH_VERSINFO[0]}" -eq 4 ] && [ "${BASH_VERSINFO[1]}" -ge 4 ]; }; then
  PS0=$'\e]133;C\a'"${PS0-}"
else
  # Leave an existing DEBUG trap (bash-preexec etc.) alone; only the running state is lost then.
  [ -z "$(trap -p DEBUG)" ] && trap '_mdt_preexec "$_"' DEBUG
fi
