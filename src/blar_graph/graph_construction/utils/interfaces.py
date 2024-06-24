class GlobalGraphInfo:
    visited_nodes: dict
    imports: dict
    import_aliases: dict
    inheritances: dict
    entity_id: str

    def __init__(self, entity_id: str):
        self.visited_nodes = {}
        self.imports = {}
        self.import_aliases = {}
        self.inheritances = {}
        self.entity_id = entity_id
