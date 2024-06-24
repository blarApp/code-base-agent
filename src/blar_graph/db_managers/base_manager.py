from abc import ABC, abstractmethod


class BaseDBManager(ABC):
    @abstractmethod
    def save_graph(self):
        pass
