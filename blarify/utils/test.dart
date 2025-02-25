void main() {
  // Class Example
  var person = Person('Alice', 30);
  person.greet();

  // Record Example
  var car = ('Tesla', 'Model S', 2024);
  print('${car.$1} ${car.$2}, Year: ${car.$3}');

  // Struct-like Immutable Class
  const p2 = ImmutablePerson('Bob', 40);
  p2.show();

  // Record Function Example
  var user = getUser();
  print('User: ${user.$1}, ${user.$2}');
}

// 1. Class
class Person {
  String name;
  int age;
  Person(this.name, this.age);
  void greet() => print('Hi, I am $name.');
  void thing() {
    print('I am $age years old.');
  }
}

// 2. Record Function
(String, int) getUser() => ('Charlie', 25);

// 3. Immutable Struct-like Class
class ImmutablePerson {
  final String name;
  final int age;
  const ImmutablePerson(this.name, this.age);
  void show() => print('$name is $age years old.');
}
