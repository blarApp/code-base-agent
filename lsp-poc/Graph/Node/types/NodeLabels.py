from enum import Enum

NodeLabels = Enum(
    "NodeLabels", ["FOLDER", "FILE", "FUNCTION", "CLASS", "METHOD", "MODULE"]
)
