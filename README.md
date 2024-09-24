# C++ Extension for StarUML (AS version)

This is a changed version of the C++ extension for StarUML made for my needs (based on v0.9.3).  
"AS version" stands for "Andrea Sorrentino version".

**v1.0.1**
- Support to destructors (UMLOperation with `<<destructor>>` stereotype).
- Support to inline methods (UMLOperation with `<<inline>>` stereotype).
- Support to `[in]`, `[out]` and `[in, out]` annotations for parameters documentation.
- Support to example elements (UML elements with `<<example>>` stereotype are not generated).
- Support to `const` keyword for methods, parameters and return types (`isQuery`/`isReadOnly` properties in StarUML).
- If the struct has no methods, the `.cpp` file is not generated.
- For enums with more than 5 elements, each literal is written on a separate line.
- Generates documentation for enumerations.
- Generates `#include` statements for C++ standard types used inside the defined classes/structs (`string`, `vector`, `list`, `set`, `size_t`, `int16_t`), and adds comments specifying the types provided by the included libraries. It also generates the `using namespace std;` statement if required.
- Option to enable/disable the inclusion of libraries for C++ standard types.
- Option to enable/disable the generation of the `using namespace std;` statement.
- Option to enable/disable comments about the types provided by the included libraries.
- Option to enable/disable the generation of return statements inside method implementations.
- Option to use `NULL` instead of `nullptr`.
- Option to use lowercase for directory names.

Fixes:
- Generates documentation for method return types (description was missing in v1.0.0).
- Correct struct members indentation when docs generation is enabled.
- Removed an extra space generated after "public:", "protected:", and "private:" strings.
- Removed the `void` type from class constructors.
- Return statement generation:
  - Replaced `null` (syntactically wrong) with `nullptr`.
  - Generates `return nullptr;` only for pointer types. Previously, this statement was generated for all the unrecognized types.

Changes:
- Removed the `return void;` statement in methods implementations with a void return type.

**v1.0.0**
- Improved code indentation.
- Spaces removal from class names.
- Support to different types of associations (direct association, aggregation and composition).
- Generates interface methods within the classes implementing the interface.
- Generates project documentation at the beginning of source files (file header comment).
- Support to structs (UMLClass with a `<<struct>>` stereotype is translated into a C struct).
- Generates documentation for methods parameters and return types.
- Class documentation moved from implementation file (`.cpp`) to header file (`.h`).
- Translates a package with the naming convention `Package.Subpackage` into a directory `Subpackage`.
- Option to enable/disable documentation generation.
- Option to enable/disable file header comment generation.

Fixes:
- Fixed indentation issues.
- Fixed issues related to associations that were not generated.

Changes:
- Header file macros follow the convention `CLASS_NAME_H` (spaces are replaced with underscores).
- File names are in snake case (e.g. `class_name.h` / `class_name.cpp`).
- Class names are in Pascal case (e.g. `MyClass`).

### Some notes about associations
- Direct associations/aggregation translates into a member variable pointer to the linked class.
- Composition translates into a member variable having as type the linked class.
- The member variable pointer visibility is deduced from `end2.visibility` for associations  and `end1.visibility` for aggregations/compositions.
- If multiplicity is `0..*`, `1..*` or `*`, it translates into a C++ vector type. If multiplicity is `0..1` (optional partecipation), it translates into a pointer.
- When creating an aggregation or composition in StarUML, make sure to trace it from the content to the container, otherwise the generation will fail,
  because it assumes `end1` as content and `end2` as container.

## C++ Extension for StarUML (version 0.9.3)
Install this extension from Extension Manager of StarUML, using this repository URL.

> :warning: This extensions do not provide perfect reverse engineering which is a test and temporal feature. If you need a complete reverse engineering feature, please check other professional reverse engineering tools.

### UMLPackage

- converted to folder.

### UMLClass

- converted to _Cpp Class_. (as a separate `.h` file)
- `visibility` to one of modifiers `public`, `protected`, `private`. If visibility is not setted, consider as `protected`.
- `isFinalSpecialization` and `isLeaf` property to `final` modifier.
- Default constructor is generated.
- All contained types (_UMLClass_, _UMLInterface_, _UMLEnumeration_) are generated as inner type definition.
- TemplateParameter to _Cpp Template_.

### UMLAttribute

- converted to _Cpp Field_.
- `visibility` property to one of modifiers `public`, `protected`, `private`. If visibility is not setted, consider as `protected`.
- `name` property to field identifier.
- `type` property to field type.
- `multiplicity` property to vector type.
- `isStatic` property to `static` modifier.
- `isLeaf` property to `final` modifier.
- `defaultValue` property to initial value.
- Documentation property to JavaDoc comment.

### UMLOperation

- converted to _Cpp Methods_.
- `visibility` to one of modifiers `public`, `protected`, `private`. If visibility is not setted, consider as `protected`.
- `name` property to method identifier.
- `isAbstract` property to `virtual` modifier. (TODO need options to create pure-virtual function or virtual function)
- `isStatic` property to `static` modifier.
- _UMLParameter_ to _Cpp Method Parameters_.
- _UMLParameter_'s name property to parameter identifier.
- _UMLParameter_'s type property to type of parameter.
- _UMLParameter_ with `direction` = `return` to return type of method. When no return parameter, `void` is used.
- _UMLParameter_ with `isReadOnly` = `true` to `const` modifier of parameter.

### UMLInterface

- converted to _Cpp Class_. (as a separate `.h` file)
- `visibility` property to one of modifiers `public`, `protected`, `private`. If visibility is not setted, consider as `protected`.
- all method will treated as pure virtaul.

### UMLEnumeration

| Weekdays |
| -------- |
| Monday   |
| Tuesday  |
| Saturday |

converts

```c
/* Test header @ toori67
 * This is Test
 * also test
 * also test again
 */
#ifndef (_WEEKDAYS_H)
#define _WEEKDAYS_H

enum Weekdays { Monday,Tuesday,Saturday };

#endif //_WEEKDAYS_H
```

- converted to _Cpp Enum_. (as a separate `.h` file)
- `visibility` property to one of modifiers `public`, `protected`, `private`. If visibility is not setted, consider as `protected`.
- _UMLEnumerationLiteral_ to literals of enum.

### UMLAssociationEnd

- converted to _Cpp Field_.
- `visibility` property to one of modifiers `public`, `protected`, `private`. If visibility is not setted, consider as `protected`.
- `name` property to field identifier.
- `type` property to field type.
- If `multiplicity` is one of `0..*`, `1..*`, `*`, then collection type (`std::vector<T>` ) is used.
- `defaultValue` property to initial value.

### UMLGeneralization & UMLInterfaceRealization

- converted to _Cpp Inheritance_ (`:`).
- Allowed for _UMLClass_ to _UMLClass_, and _UMLClass_ to _UMLInterface_.

## C++ Reverse Engineering

1. Click the menu (`Tools > C++ > Reverse Code...`)
2. Select a folder containing C++ source files to be converted to UML model elements.
3. `CppReverse` model will be created in the Project.

Belows are the rules to convert from C++ source code to UML model elements.

### C++ Namespace

- converted to _UMLPackage_.

### C++ Class

- converted to _UMLClass_.
- Class name to `name` property.
- Type parameters to _UMLTemplateParameter_.
- Access modifier `public`, `protected` and `private` to `visibility` property.
- `abstract` modifier to `isAbstract` property.
- Constructors to _UMLOperation_ with stereotype `<<constructor>>`.
- All contained types (_UMLClass_, _UMLInterface_, _UMLEnumeration_) are generated as inner type definition.

### C++ Field (to UMLAttribute)

- converted to _UMLAttribute_ if **"Use Association"** is **off** in Preferences.
- Field type to `type` property.

  - Primitive Types : `type` property has the primitive type name as string.
  - `T[]`(array) or its decendants: `type` property refers to `T` with multiplicity `*`.
  - `T` (User-Defined Types) : `type` property refers to the `T` type.
  - Otherwise : `type` property has the type name as string.

- Access modifier `public`, `protected` and `private` to `visibility` property.
- `static` modifier to `isStatic` property.
- Initial value to `defaultValue` property.

### C++ Field (to UMLAssociation)

- converted to (Directed) _UMLAssociation_ if **"Use Association"** is **on** in Preferences and there is a UML type element (_UMLClass_, _UMLInterface_, or _UMLEnumeration_) correspond to the field type.
- Field type to `end2.reference` property.

  - `T[]`(array) or its decendants: `reference` property refers to `T` with multiplicity `*`.
  - `T` (User-Defined Types) : `reference` property refers to the `T` type.
  - Otherwise : converted to _UMLAttribute_, not _UMLAssociation_.

- Access modifier `public`, `protected` and `private` to `visibility` property.

### C++ Method

- converted to _UMLOperation_.
- Type parameters to _UMLTemplateParameter_.
- Access modifier `public`, `protected` and `private` to `visibility` property.
- `static` modifier to `isStatic` property.
- `abstract` modifier to `isAbstract` property.

### C++ Enum

- converted to _UMLEnumeration_.
- Enum name to `name` property.
- Type parameters to _UMLTemplateParameter_.
- Access modifier `public`, `protected` and `private` to `visibility` property.

---

Licensed under the MIT license (see LICENSE file).
