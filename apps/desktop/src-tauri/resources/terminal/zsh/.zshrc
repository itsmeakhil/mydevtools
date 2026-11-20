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

# Prompt marks and cwd, written in-band so the app reads them in output order:
# OSC 133 A = prompt (idle), C = command started (running), OSC 7 = directory
# (new splits open there). The app also uses A to jump between prompts.
_mdt_precmd() {
  local p=${PWD//\%/%25}
  print -rn -- $'\e]7;file://'"$HOST${p// /%20}"$'\a\e]133;A\a'
}
_mdt_preexec() { print -rn -- $'\e]133;C\a' }
autoload -Uz add-zsh-hook
add-zsh-hook precmd _mdt_precmd
add-zsh-hook preexec _mdt_preexec
