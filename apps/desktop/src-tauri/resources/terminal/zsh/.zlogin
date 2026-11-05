# MyDevTools Terminal: only reached when .zshrc was skipped (non-interactive
# login shell); interactive shells read the user's .zlogin directly because
# .zshrc hands ZDOTDIR back. Load it and hand ZDOTDIR back here too.
ZDOTDIR=$MDT_USER_ZDOTDIR
[[ -r $ZDOTDIR/.zlogin ]] && source $ZDOTDIR/.zlogin
if [[ $MDT_USER_ZDOTDIR == $HOME ]]; then unset ZDOTDIR; else export ZDOTDIR=$MDT_USER_ZDOTDIR; fi
