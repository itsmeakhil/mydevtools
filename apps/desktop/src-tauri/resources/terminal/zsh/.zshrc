# MyDevTools Terminal: load the user's .zshrc (see .zshenv), then hand ZDOTDIR
# back so zsh reads their .zlogin and child shells see their own config.
_mdt_zd=$ZDOTDIR
ZDOTDIR=$MDT_USER_ZDOTDIR
# /etc/zshrc ran while ZDOTDIR was ours: re-point what it derived from it.
[[ $HISTFILE == $_mdt_zd/.zsh_history ]] && HISTFILE=$ZDOTDIR/.zsh_history
[[ -r $ZDOTDIR/.zkbd/${TERM}-${VENDOR} ]] && source $ZDOTDIR/.zkbd/${TERM}-${VENDOR}
unset _mdt_zd
[[ -r $ZDOTDIR/.zshrc ]] && source $ZDOTDIR/.zshrc
if [[ $MDT_USER_ZDOTDIR == $HOME ]]; then unset ZDOTDIR; else export ZDOTDIR=$MDT_USER_ZDOTDIR; fi

# Login files (path_helper, brew shellenv, ...) reorder PATH: put the claude shim first again.
[[ -n $MDT_SHIM_DIR ]] && path=("$MDT_SHIM_DIR" ${path:#${(b)MDT_SHIM_DIR}})

# Status hooks, backgrounded and disowned so the prompt never waits on the socket.
if [[ -n $MDT_HOOK_BIN ]]; then
  _mdt_precmd() { "$MDT_HOOK_BIN" shell-prompt </dev/null >/dev/null 2>&1 &! }
  _mdt_preexec() { "$MDT_HOOK_BIN" shell-exec </dev/null >/dev/null 2>&1 &! }
  autoload -Uz add-zsh-hook
  add-zsh-hook precmd _mdt_precmd
  add-zsh-hook preexec _mdt_preexec
fi
