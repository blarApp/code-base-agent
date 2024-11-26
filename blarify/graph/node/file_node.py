from blarify.graph.node import NodeLabels
from .types.definition_node import DefinitionNode


class FileNode(DefinitionNode):
    def __init__(self, **kwargs):
        super().__init__(label=NodeLabels.FILE, **kwargs)

    @property
    def node_repr_for_identifier(self):
        if self.parent:
            return "/" + self.name
        return self.pure_paths

    def as_object(self):
        obj = super().as_object()
        obj["attributes"]["text"] = self.code_text
        return obj
