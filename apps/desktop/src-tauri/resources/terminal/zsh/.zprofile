# MyDevTools Terminal: load the user's .zprofile (see .zshenv).
_mdt_zd=$ZDOTDIR
ZDOTDIR=$MDT_USER_ZDOTDIR
[[ -r $ZDOTDIR/.zprofile ]] && source $ZDOTDIR/.zprofile
ZDOTDIR=$_mdt_zd
unset _mdt_zd
