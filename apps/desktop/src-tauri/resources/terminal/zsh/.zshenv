# MyDevTools Terminal: zsh reads this because ZDOTDIR points here. Each startup
# file loads the user's own same-named file from their real ZDOTDIR, then
# points ZDOTDIR back here so zsh picks up the next one.
_mdt_zd=$ZDOTDIR
ZDOTDIR=${MDT_USER_ZDOTDIR:-$HOME}
[[ -r $ZDOTDIR/.zshenv ]] && source $ZDOTDIR/.zshenv
# The user's .zshenv may move their ZDOTDIR (e.g. ~/.config/zsh); follow it.
export MDT_USER_ZDOTDIR=$ZDOTDIR
ZDOTDIR=$_mdt_zd
unset _mdt_zd
