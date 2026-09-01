from rest_framework import permissions


class IsSuperUser(permissions.BasePermission):
    """
    Allows access only to superusers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsClub(permissions.BasePermission):
    """
    Allows access only to users with role CLUB.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'CLUB' or request.user.is_superuser)
        )


class IsPlayer(permissions.BasePermission):
    """
    Allows access only to users with role PLAYER.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'PLAYER' or request.user.is_superuser)
        )


class IsSponsor(permissions.BasePermission):
    """
    Allows access only to users with role SPONSOR.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'SPONSOR' or request.user.is_superuser)
        )


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Allows full write access to author/superuser, read-only for others.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        author = getattr(obj, 'author', getattr(obj, 'user', getattr(obj, 'player', None)))
        return bool(author == request.user or request.user.is_superuser)
