from Graph.Node import Node, NodeLabels


class FileNode(Node):
    def __init__(self, path: str):
        super().__init__(NodeLabels.FILE, path)

    def __str__(self):
        return f"{self.label}({self.path})"
