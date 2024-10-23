from Graph.Node import Node, NodeLabels


class FileNode(Node):
    def __init__(self, path: str):
        super().__init__(NodeLabels.FILE, path)
