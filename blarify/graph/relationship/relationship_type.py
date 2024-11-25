from enum import Enum


class RelationshipType(Enum):
    # Code hierarchy
    CONTAINS = "CONTAINS"
    FUNCTION_DEFINITION = "FUNCTION_DEFINITION"
    CLASS_DEFINITION = "CLASS_DEFINITION"

    # Code references
    IMPORTS = "IMPORTS"
    CALLS = "CALLS"
    INHERITS = "INHERITS"
    INSTANTIATES = "INSTANTIATES"
    TYPING = "TYPING"
    ASSIGNMENT = "ASSIGNMENT"
    USES = "USES"

    # Code diff
    MODIFIED = "MODIFIED"
    DELETED = "DELETED"
    ADDED = "ADDED"
