class GlobalGraphInfo:
    visited_nodes: dict
    imports: dict
    import_aliases: dict
    autoloaded_modules: dict
    inheritances: dict
    entity_id: str
    aliases: dict

    def __init__(self, entity_id: str):
        self.visited_nodes = {}
        self.imports = {}
        self.import_aliases = {}
        self.auto_loaded_imports = {}
        self.inheritances = {}
        self.entity_id = entity_id
        self.aliases = {}
