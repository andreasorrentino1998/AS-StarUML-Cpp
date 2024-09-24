/*
 * Copyright (c) 2014-2018 MKLab. All rights reserved.
 * Copyright (c) 2014 Sebastian Schleemilch
 * Copyright (c) 2024 Andrea Sorrentino
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

const _CPP_CODE_GEN_H = "h";
const _CPP_CODE_GEN_CPP = "cpp";

const path = require("path");
const fs = require("fs");
const codegen = require("./codegen-utils");

var copyrightHeader =
  "/* Test header @ toori67 \n * This is Test\n * also test\n * also test again\n */";
var versionString = "v0.0.1";

/**
 * Cpp Code Generator
 */
class CppCodeGenerator {
  /**
   * @constructor
   *
   * @param {type.UMLPackage} baseModel
   * @param {string} basePath generated files and directories to be placed
   *
   */
  constructor(baseModel, basePath) {
    /** @member {type.Model} */
    this.baseModel = baseModel;

    /** @member {string} */
    this.basePath = basePath;

    var doc = "";
    // If "generate file header comment" option is enabled
    if(app.preferences.get("cpp.gen.genFileHeaderComment")){
        // It uses as file header comment the project documentation field
        // Otherwise, if specified inside the preferences, uses the old one
        if(app.preferences.get("cpp.gen.genOldFileHeaderComment")){
            if (
              app.project.getProject().name &&
              app.project.getProject().name.length > 0
            ) {
              doc += "\nProject " + app.project.getProject().name;
            }
            if (
              app.project.getProject().author &&
              app.project.getProject().author.length > 0
            ) {
              doc += "\n@author " + app.project.getProject().author;
            }
            if (
              app.project.getProject().version &&
              app.project.getProject().version.length > 0
            ) {
              doc += "\n@version " + app.project.getProject().version;
              copyrightHeader = this.getHeaderDocuments(doc);
            }
        }
        else copyrightHeader = this.getHeaderDocuments(app.project.getProject().documentation);
      
    }
    else copyrightHeader = "";
  }

  /**
   * Return Indent String based on options
   * @param {Object} options
   * @return {string}
   */
  getIndentString(options) {
    if (options.useTab) {
      return "\t";
    } else {
      var i, len;
      var indent = [];
      for (i = 0, len = options.indentSpaces; i < len; i++) {
        indent.push(" ");
      }
      return indent.join("");
    }
  }

  generate(elem, basePath, options) {
    // Element with <<example>> stereotype are not translated into code.
    // They are supposed to be just example classes, representing how a developer should interact with the modeled system
    if(elem.stereotype == "example") return;

    this.genOptions = options;

    var getFilePath = (extenstions) => {
      var absPath = basePath + "/" + elem.name.replace(/\s+/g, '_').toLowerCase() + ".";
      if (extenstions === _CPP_CODE_GEN_H) {
        absPath += _CPP_CODE_GEN_H;
      } else {
        absPath += _CPP_CODE_GEN_CPP;
      }
      return absPath;
    };

    var writeEnumeration = (codeWriter, elem, cppCodeGen) => {
      var i;
      var modifierList = cppCodeGen.getModifiers(elem);
      var modifierStr = "";
      for (i = 0; i < modifierList.length; i++) {
        modifierStr += modifierList[i] + " ";
      }
      
      // If there are more than 5 literals, or doc is enabled, write each literal on a separate line
      if(elem.literals.length > 5 || app.preferences.get("cpp.gen.genDoc")){
        var docs = cppCodeGen.getDocuments(elem.documentation);
        if(docs != "") docs += "\n";
        var enumStr = docs + "enum " + elem.name.replace(/\s+/g, '') + " {\n\t";
        for(var i = 0; i < elem.literals.length; i++){
          var literalDoc = cppCodeGen.getDocuments(elem.literals[i].documentation).replace(/\n/g, '\n\t');
          enumStr += literalDoc + elem.literals[i].name;
          if(i != elem.literals.length - 1) enumStr += ",\n\t";
        }
        enumStr += "\n};";
        codeWriter.writeLine(enumStr);
      }
      // Otherwise write each of them on a separate line.
      else codeWriter.writeLine(
        modifierStr +
          "enum " +
          elem.name.replace(/\s+/g, '') +
          " { " +
          elem.literals.map((lit) => lit.name).join(", ") +
          " };",
      );
    };

    var writeClassHeader = (codeWriter, elem, cppCodeGen) => {
      var i;
      var write = (items) => {
        var i;
        for (i = 0; i < items.length; i++) {
          var item = items[i];
          if (
            item instanceof type.UMLAttribute ||
            item instanceof type.UMLAssociationEnd
          ) {
            // if write member variable
            codeWriter.writeLine(cppCodeGen.getMemberVariable(item, i));
          } else if (item instanceof type.UMLOperation || item.hasOwnProperty("objType")) {
            // if write method
            codeWriter.writeLine(cppCodeGen.getMethod(item, i, false));
          } else if (item instanceof type.UMLClass) {
            writeClassHeader(codeWriter, item, cppCodeGen);
          } else if (item instanceof type.UMLEnumeration) {
            writeEnumeration(codeWriter, item, cppCodeGen);
          }
        }
      };

      var writeInheritance = (elem) => {
        var inheritString = ": ";
        var genList = cppCodeGen.getSuperClasses(elem);
        if (genList.length === 0) {
          return "";
        }
        var i;
        var term = [];
        for (i = 0; i < genList.length; i++) {
          var generalization = genList[i];
          // public AAA, private BBB
          term.push(
            generalization.visibility + " " + generalization.target.name.replace(/\s+/g, ''),
          );
        }
        inheritString += term.join(", ");
        return inheritString;
      };

      // member variable
      var memberAttr = elem.attributes.slice(0);
      var associations = app.repository.getRelationshipsOf(
        elem,
        function (rel) {
          return rel instanceof type.UMLAssociation;
        },
      );
      for (i = 0; i < associations.length; i++) {
        var asso = associations[i];
        if (
          asso.end1.reference === elem &&
          asso.end2.navigable == "navigable"
        ) {
          memberAttr.push(asso.end2);
        } else if (
          asso.end2.reference === elem &&
          asso.end1.navigable == "navigable"
        ) {
          memberAttr.push(asso.end1);
        }
        // Check if the association is "aggregation" or "composition"
        else if (asso.end2.reference === elem && (asso.end2.aggregation == "shared" || asso.end2.aggregation == "composite")) {
            memberAttr.push(asso.end1);
        }
      }

      // method
      var methodList = elem.operations.slice(0);
      var innerElement = [];
      for (i = 0; i < elem.ownedElements.length; i++) {
        var element = elem.ownedElements[i];
        if (
          element instanceof type.UMLClass ||
          element instanceof type.UMLEnumeration
        ) {
          innerElement.push(element);
        }
      }

      // Add methods from the interface (override)
      for(i = 0; i < elem.ownedElements.length; i++) {
        var element = elem.ownedElements[i];
        if(element instanceof type.UMLInterfaceRealization)
          for(var j = 0; j < element.target.operations.length; j++){
            var interfaceMethod = { ...element.target.operations[j] }; // you should make a copy, in order to not change the interface methods.
            interfaceMethod.isAbstract = false;  // Interfaces have abstracts methods, but the class should have a concrete method version.

            // Since the copy of the object doesn't use the same prototype, the cloned object is not of type "UMLOperation"
            // So we add our objType indentifier. If getMethod() finds that the object is not an instance of "UMLOperation"
            // it will check for the property "objType". We don't use factory.create() from StarUML API, because it creates new object inside the project.
            interfaceMethod.objType = "UMLOperation";   
            methodList.push(interfaceMethod);
          }
      }

      // Add the class description (documentation) before the class header declaration.
      if ((typeof elem.documentation === "string") && elem.documentation != "") {
        // We should check if doc is enabled, otherwise getDocuments returns "" and it will write a new file.
        if(app.preferences.get("cpp.gen.genDoc")) codeWriter.writeLine(cppCodeGen.getDocuments(elem.documentation));
      }
      

      var allMembers = memberAttr.concat(methodList).concat(innerElement);
      var classfiedAttributes = cppCodeGen.classifyVisibility(allMembers);
      
      var finalModifier = "";
      if (elem.isFinalSpecialization === true || elem.isLeaf === true) {
        finalModifier = " final ";
      }
      var templatePart = cppCodeGen.getTemplateParameter(elem);
      if (templatePart.length > 0) {
        codeWriter.writeLine(templatePart);
      }
      
      // Check if it's a C struct (if the UML class has a <<struct>> stereotype)
      // So generate a strcut
      if(elem.stereotype == "struct"){
        codeWriter.writeLine("typedef struct {");
        if (classfiedAttributes._public.length > 0) {
          codeWriter.indent();
          write(classfiedAttributes._public);
          codeWriter.outdent();
        }
        codeWriter.writeLine("} " + elem.name.replace(/\s+/g, '') + ";");
      }
      else {
        codeWriter.writeLine(
        "class " + elem.name.replace(/\s+/g, '') + finalModifier + writeInheritance(elem) + " {",
        );
        if (classfiedAttributes._private.length > 0) {
          codeWriter.indent();
          codeWriter.writeLine("private:");
          codeWriter.indent();
          write(classfiedAttributes._private);
          codeWriter.outdent();
          codeWriter.outdent();
        }
        if (classfiedAttributes._protected.length > 0) {
          codeWriter.indent();
          codeWriter.writeLine("protected:");
          codeWriter.indent();
          write(classfiedAttributes._protected);
          codeWriter.outdent();
          codeWriter.outdent();
        }
        if (classfiedAttributes._public.length > 0) {
          codeWriter.indent();
          codeWriter.writeLine("public:");
          codeWriter.indent();
          write(classfiedAttributes._public);
          codeWriter.outdent();
          codeWriter.outdent();
        }
  
        codeWriter.writeLine("};");
      }
      
    };

    var writeClassBody = (codeWriter, elem, cppCodeGen) => {
      var i = 0;
      var item;
      var writeClassMethod = (elemList) => {
        for (i = 0; i < elemList._public.length; i++) {
          item = elemList._public[i];
          if (item instanceof type.UMLOperation || item.hasOwnProperty("objType")) {
            // if write method
            codeWriter.writeLine(cppCodeGen.getMethod(item, i, true));
          } else if (item instanceof type.UMLClass) {
            writeClassBody(codeWriter, item, cppCodeGen);
          }
        }

        for (i = 0; i < elemList._protected.length; i++) {
          item = elemList._protected[i];
          if (item instanceof type.UMLOperation || item.hasOwnProperty("objType")) {
            // if write method
            codeWriter.writeLine(cppCodeGen.getMethod(item, i, true));
          } else if (item instanceof type.UMLClass) {
            writeClassBody(codeWriter, item, cppCodeGen);
          }
        }

        for (i = 0; i < elemList._private.length; i++) {
          item = elemList._private[i];
          if (item instanceof type.UMLOperation || item.hasOwnProperty("objType")) {
            // if write method
            codeWriter.writeLine(cppCodeGen.getMethod(item, i, true));
          } else if (item instanceof type.UMLClass) {
            writeClassBody(codeWriter, item, cppCodeGen);
          }
        }
      };

      // parsing class
      var methodList = cppCodeGen.classifyVisibility(elem.operations.slice(0));
      /* I don't want this inside the cpp file.
      var docs = this->elem.name + " implementation\n\n";
      if (typeof elem.documentation === "string") {
        docs += elem.documentation;
      }
      codeWriter.writeLine(cppCodeGen.getDocuments(docs));*/
      writeClassMethod(methodList);

      // parsing nested class
      var innerClass = [];
      for (i = 0; i < elem.ownedElements.length; i++) {
        var element = elem.ownedElements[i];
        if (element instanceof type.UMLClass) {
          innerClass.push(element);
        }
      }
      if (innerClass.length > 0) {
        innerClass = cppCodeGen.classifyVisibility(innerClass);
        writeClassMethod(innerClass);
      }
    };

    var fullPath, file;

    // Package -> as namespace or not
    // Since I have "Package1.Subpackage" inside my StarUML project (in order to show more info about a module inside UML Class Diagram)
    // we need to remove the parent packages from the name, when generating the package folder.
    if (elem instanceof type.UMLPackage) {
      var packageName = elem.name;
      var lastDotIndex = elem.name.lastIndexOf(".");
      if(lastDotIndex > 0) packageName = elem.name.substring(lastDotIndex + 1);

      if(app.preferences.get("cpp.gen.useLowercaseForDirectories")) packageName = packageName.toLowerCase();
      fullPath = path.join(basePath, packageName);
      fs.mkdirSync(fullPath);
      if (Array.isArray(elem.ownedElements)) {
        elem.ownedElements.forEach((child) => {
          return this.generate(child, fullPath, options);
        });
      }
    } else if (elem instanceof type.UMLClass) {
      // generate class header elem_name.h
      file = getFilePath(_CPP_CODE_GEN_H);
      fs.writeFileSync(
        file,
        this.writeHeaderSkeletonCode(elem, options, writeClassHeader),
      );
      // generate class cpp elem_name.cpp
      if (options.genCpp) {
         // If it's a C struct and there are no operation defines, doesn't generate the cpp
        if (!(elem.stereotype == "struct" && elem.operations.length == 0)){
          file = getFilePath(_CPP_CODE_GEN_CPP);
          fs.writeFileSync(
            file,
            this.writeBodySkeletonCode(elem, options, writeClassBody),
          );
        }
      }
    } else if (elem instanceof type.UMLInterface) {
      /*
       * interface will convert to class which only contains virtual method and member variable.
       */
      // generate interface header ONLY elem_name.h
      file = getFilePath(_CPP_CODE_GEN_H);
      fs.writeFileSync(
        file,
        this.writeHeaderSkeletonCode(elem, options, writeClassHeader),
      );
    } else if (elem instanceof type.UMLEnumeration) {
      // generate enumeration header ONLY elem_name.h
      file = getFilePath(_CPP_CODE_GEN_H);
      fs.writeFileSync(
        file,
        this.writeHeaderSkeletonCode(elem, options, writeEnumeration),
      );
    }
  }

  /**
   * Write *.h file. Implement functor to each uml type.
   * Returns text
   *
   * @param {Object} elem
   * @param {Object} options
   * @param {Object} funct
   * @return {string}
   */
  writeHeaderSkeletonCode(elem, options, funct) {
    var elemName = elem.name.replace(/\s+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();  // Changes "My SuperClass" into "My_Super_Class".
    elemName = elemName[0] + elemName.slice(1).replace(/[A-Z]/g, letter => '_'); // Changes "My_Super_Class" into "MY_SUPER_CLASS"
    var headerString = elemName.toUpperCase() + "_H";
    var codeWriter = new codegen.CodeWriter(this.getIndentString(options));
    var includePart = this.getIncludePart(elem);
    if(copyrightHeader != ""){
      codeWriter.writeLine(copyrightHeader);
    }
    codeWriter.writeLine("#ifndef " + headerString);
    codeWriter.writeLine("#define " + headerString);
    codeWriter.writeLine();
    
    if (includePart.length > 0) {
      codeWriter.writeLine(includePart);  // #include
    }

    // ======= BEGIN OF INCLUDE PART ==================
    // Include some common C++ standard type used inside attributes and methods
    // TODO: refactor this section. This is a really bad code, made to get a quick implementation of this functionality!
    if(app.preferences.get("cpp.gen.includeCommonCppStdTypes")){
      const standardTypes = ["string", "vector", "set", "list",  "size_t", "int16_t"];  // TODO: make it order-indipendent. Now, if you change the order, the algorithm may not work well.
      const standardTypesLibraries = ["<string>", "<vector>", "<set>", "<list>", "<stddef.h>", "<cstdint>"]
      var standardTypesInclude = [false, false, false, false, false, false];

      // Check if the std types are used by class attributes
      for(var i = 0; i < elem.attributes.length; i++){
        for(var j = 0; j < standardTypes.length; j++){
          // Check if the attribute have "multiplicity" N
          if(["0..*", "1..*", "*"].includes(elem.attributes[i].multiplicity.trim())) standardTypesInclude[1] = true;  // so include vector type
          
          if(elem.attributes[i].type instanceof type.UMLPrimitiveType ||     // check if it's a UMLType
            elem.attributes[i].type instanceof type.UMLEnumeration ||
            elem.attributes[i].type instanceof type.UMLInterface ||
            elem.attributes[i].type instanceof type.UMLClass
          ){   
            // For vector, set, list we need to check if type has a template format (e.g vector<>), otherwise these type will not be recognized.
            if(j > 0 && j < 4){
              if(elem.attributes[i].type.name.includes(standardTypes[j]+"<")) standardTypesInclude[j] = true;
            }
            else {
              if(elem.attributes[i].type.name === standardTypes[j] || (elem.attributes[i].type.name + "*") === standardTypes[j]){ // * for pointers
                standardTypesInclude[j] = true;
              }
            }
          }
          else{ // otherwise 'type' is string field
            if(j > 0 && j < 4){
              if(elem.attributes[i].type.includes(standardTypes[j]+"<")) standardTypesInclude[j] = true;
            }
            else{
              if(elem.attributes[i].type === standardTypes[j] || (elem.attributes[i].type + "*") === standardTypes[j]){
                standardTypesInclude[j] = true;
              }
            }
          }
        }
      }

      // Check if the std types are used by methods parameters or as return types
      for(var i = 0; i < elem.operations.length; i++){
        for(var j = 0; j < elem.operations[i].parameters.length; j++){
          for(var k = 0; k < standardTypes.length; k++){
            // Check if the parameter have "multiplicity" N
            if(["0..*", "1..*", "*"].includes(elem.operations[i].parameters[j].multiplicity.trim())) standardTypesInclude[1] = true; // so include vector type
            
            var paramType = elem.operations[i].parameters[j].type;
            if(elem.operations[i].parameters[j].type instanceof type.UMLPrimitiveType ||
              elem.operations[i].parameters[j].type instanceof type.UMLEnumeration ||
              elem.operations[i].parameters[j].type instanceof type.UMLInterface ||
              elem.operations[i].parameters[j].type instanceof type.UMLClass
            ){
              if(k > 0 && k < 4){
                if(elem.operations[i].parameters[j].type.name.includes(standardTypes[k]+"<")) standardTypesInclude[k] = true;
              }
              else{
                if(elem.operations[i].parameters[j].type.name === standardTypes[k] || (elem.operations[i].parameters[j].type.name + "*") === standardTypes[k]){
                  standardTypesInclude[k] = true;
                }
              }
            }
            else {
              if(k > 0 && k < 4){
                if(elem.operations[i].parameters[j].type.includes(standardTypes[k]+"<")) standardTypesInclude[k] = true;
              }
              else{
                if(elem.operations[i].parameters[j].type === standardTypes[k] || (elem.operations[i].parameters[j].type + "*") === standardTypes[k]){
                  standardTypesInclude[k] = true;
                }
              }
            }
          }
        }
      }

      // Check if class associations translate into an attribute of "vector" type
      var associationEnds = [];
      var associations = app.repository.getRelationshipsOf(elem,
        function (rel) {
          return rel instanceof type.UMLAssociation;
        },
      );
      for(var i = 0; i < associations.length; i++) {
        var asso = associations[i];
        if (asso.end1.reference === elem && asso.end2.navigable == "navigable"){
          associationEnds.push(asso.end2);
        }
        else if (asso.end2.reference === elem && asso.end1.navigable == "navigable"){
          associationEnds.push(asso.end1);
        }
        else if (asso.end2.reference === elem && (asso.end2.aggregation == "shared" || asso.end2.aggregation == "composite")) {
          associationEnds.push(asso.end1);
        }
      }
      
      for(var i = 0; i < associationEnds.length; i++){
        // If multiplicity is 0:N, 1:N or N, it translates into a vectory type, so add vector among the used types.
        if(["0..*", "1..*", "*"].includes(associationEnds[i].multiplicity.trim())) standardTypesInclude[1] = true;
      }

      // Write the include (e.g. #include <vector>  // Provides: vector)
      var includesGenerated = false;
      for(var i = 0; i < standardTypes.length; i++){
        if(standardTypesInclude[i]){
          includesGenerated = true;
          var includeStr = "#include " + standardTypesLibraries[i];
          var tabs = "\t\t";
          //if(standardTypes[i] == "set" || standardTypes[i] == "list") tabs = "\t\t";
          if(app.preferences.get("cpp.gen.includeProvidedTypes")) includeStr += tabs + "// Provides: " + standardTypes[i];
          codeWriter.writeLine(includeStr);
        }
      }

      // If at least one "#include" has been generated, add a new line.
      if(includesGenerated) codeWriter.writeLine("");
      
      // Write "using namespace std;" if vector, string, set or list is included
      // And if the user option is enabled
      var writeUsingNamespaceStd = false;
      for(var i = 0; i < 4; i++) writeUsingNamespaceStd |= standardTypesInclude[i];
      
      if(writeUsingNamespaceStd && app.preferences.get("cpp.gen.addUsingNamespaceStd")) codeWriter.writeLine("using namespace std;\n");

      // ======= END OF INCLUDE PART ==================
    }


    funct(codeWriter, elem, this);

    codeWriter.writeLine();
    codeWriter.writeLine("#endif");
    return codeWriter.getData();
  }

  /**
   * Write *.cpp file. Implement functor to each uml type.
   * Returns text
   *
   * @param {Object} elem
   * @param {Object} options
   * @param {Object} functor
   * @return {Object} string
   */
  writeBodySkeletonCode(elem, options, funct) {
    var codeWriter = new codegen.CodeWriter(this.getIndentString(options));
    if(copyrightHeader != ""){
      codeWriter.writeLine(copyrightHeader);
    }
    codeWriter.writeLine('#include "' + elem.name.replace(/\s+/g, '_').toLowerCase() + '.h"');
    
    // Generates static members redefinitions
    var firstStaticMember = true;
    for(var i = 0; i < elem.attributes.length; i++){
      var attribute = elem.attributes[i];
      if(attribute.isStatic === true){
        if(firstStaticMember){
          codeWriter.writeLine(""); // add a new empty line
          firstStaticMember = false;
        }
        codeWriter.writeLine((attribute.isReadOnly ? "const ": "") + this.getType(attribute) + " " + elem.name.replace(/\s+/g, '') + "::" + attribute.name + ";");
      }
    }

    funct(codeWriter, elem, this);
    return codeWriter.getData();
  }

  /**
   * Parsing template parameter
   *
   * @param {Object} elem
   * @return {Object} string
   */
  getTemplateParameter(elem) {
    var i;
    var returnTemplateString = "";
    if (elem.templateParameters.length <= 0) {
      return returnTemplateString;
    }
    var term = [];
    returnTemplateString = "template<";
    for (i = 0; i < elem.templateParameters.length; i++) {
      var template = elem.templateParameters[i];
      var templateStr = template.parameterType + " ";
      templateStr += template.name + " ";
      if (template.defaultValue.length !== 0) {
        templateStr += " = " + template.defaultValue;
      }
      term.push(templateStr);
    }
    returnTemplateString += term.join(", ");
    returnTemplateString += ">";
    return returnTemplateString;
  }

  /**
   * Parsing include header
   *
   * @param {Object} elem
   * @return {Object} string
   */
  getIncludePart(elem) {
    var i;
    var trackingHeader = (elem, target) => {
      var header = "";
      var elementString = "";
      var targetString = "";
      var i;

      while (elem._parent._parent !== null) {
        elementString =
          elementString.length !== 0
            ? elem.name.replace(/\s+/g, '_').toLowerCase() + "/" + elementString
            : elem.name.replace(/\s+/g, '_').toLowerCase();
        elem = elem._parent;
      }
      while (target._parent._parent !== null) {
        targetString =
          targetString.length !== 0
            ? target.name.replace(/\s+/g, '_').toLowerCase() + "/" + targetString
            : target.name.replace(/\s+/g, '_').toLowerCase();
        target = target._parent;
      }

      var idx;
      for (
        i = 0;
        i < (elementString.length < targetString.length)
          ? elementString.length
          : targetString.length;
        i++
      ) {
        if (elementString[i] === targetString[i]) {
          if (elementString[i] === "/" && targetString[i] === "/") {
            idx = i + 1;
          }
        } else {
          break;
        }
      }

      // remove common path
      elementString = elementString.substring(idx, elementString.length);
      targetString = targetString.substring(idx, targetString.length);
      for (i = 0; i < elementString.split("/").length - 1; i++) {
        header += "../";
      }
      header += targetString;
      return header;
    };

    var headerString = "";
    if (app.repository.getRelationshipsOf(elem).length <= 0) {
      return "";
    }
    var associations = app.repository.getRelationshipsOf(elem, function (rel) {
      return rel instanceof type.UMLAssociation;
    });
    var realizations = app.repository.getRelationshipsOf(elem, function (rel) {
      return (
        rel instanceof type.UMLInterfaceRealization ||
        rel instanceof type.UMLGeneralization
      );
    });

    // check for interface or class
    for (i = 0; i < realizations.length; i++) {
      var realize = realizations[i];
      if (realize.target === elem) {
        continue;
      }
      headerString +=
        '#include "' + trackingHeader(elem, realize.target) + '.h"\n';
    }

    // check for member variable
    for (i = 0; i < associations.length; i++) {
      var asso = associations[i];
      var target;
      if (
        asso.end1.reference === elem &&
        asso.end2.navigable === true &&
        asso.end2.name.length !== 0
      ) {
        target = asso.end2.reference;
      } else if (
        asso.end2.reference === elem &&
        asso.end1.navigable === true &&
        asso.end1.name.length !== 0
      ) {
        target = asso.end1.reference;
      } else {
        continue;
      }
      if (target === elem) {
        continue;
      }
      headerString += '#include "' + trackingHeader(elem, target) + '.h"\n';
    }
    return headerString;
  }

  /**
   * Classfy method and attribute by accessor.(public, private, protected)
   *
   * @param {Object} items
   * @return {Object} list
   */
  classifyVisibility(items) {
    var publicList = [];
    var protectedList = [];
    var privateList = [];
    var i;
    for (i = 0; i < items.length; i++) {
      var item = items[i];
      var visib = this.getVisibility(item);

      if (visib === "public") {
        publicList.push(item);
      } else if (visib === "private") {
        privateList.push(item);
      } else {
        // if modifier not setted, consider it as protected
        protectedList.push(item);
      }
    }
    return {
      _public: publicList,
      _protected: protectedList,
      _private: privateList,
    };
  }

  /**
   * generate variables from attributes[i]
   *
   * @param {Object} elem
   * @return {Object} string
   */
  getMemberVariable(elem, index) {
    // We should check the name.length only if the elem is not a UMLAssociationEnd
    // because user could create an association without specifing any "end1/end2 name".
    if (elem.name.length > 0 || elem instanceof type.UMLAssociationEnd) {
      var terms = [];
      // doc
      var docs = "";

      // The doc inside an UMLAssociation is used as doc for the member variable derived from the association
      if(elem instanceof type.UMLAssociationEnd) docs = this.getDocuments(elem._parent.documentation).replace(/\n/g, '\n\t\t');
      else docs = this.getDocuments(elem.documentation).replace(/\n/g, '\n\t\t');  // doc for a UMLAttribute

      // If the elem belongs to a C struct, then remove one tab
      if(elem._parent.stereotype === "struct") docs = docs.replace(/\n\t\t/g, '\n\t');
      
      // modifiers
      var _modifiers = this.getModifiers(elem);
      if (_modifiers.length > 0) {
        terms.push(_modifiers.join(" "));
      }
      // type
      terms.push(this.getType(elem));
      // name
      // Check if it's an UMLAssociationEnd.
      // You should put as variable name the class name (lowerCamelCased) and not the association name.
      // The member visibility is determined by the value of "end2.visibility" for association and "end1.visibility" for aggregation/composition.
      if (elem instanceof type.UMLAssociationEnd){
        var referenceName = elem.reference.name.charAt(0).toLowerCase() + elem.reference.name.slice(1); // convert class name into lowerCaseCamel.
        referenceName = referenceName.replace(/\s+/g, '');  // removes spaces from the name

        // If multiplicity of association is > 1, add the plural form to the name.
        if(["0..*", "1..*", "*"].includes(elem.multiplicity.trim())) referenceName += "s";
        terms.push(referenceName);
      }
      else terms.push(elem.name);
      
      // initial value
      if (elem.defaultValue && elem.defaultValue.length > 0) {
        terms.push("= " + elem.defaultValue);
      }
      if(docs != ""){
          if(index > 0){
            if(elem._parent.stereotype === "struct") return "\n\t" + docs + terms.join(" ") + ";";  // for C struct 1 tab (since it doesn't have private/public keywords)
            else return "\n\t\t" + docs + terms.join(" ") + ";";  // for class 2 tabs
          }
          else return docs + terms.join(" ") + ";";
      }
      return terms.join(" ") + ";";
    }
  }

  /**
   * generate methods from operations[i]
   *
   * @param {Object} elem
   * @param {boolean} isCppBody
   * @return {Object} string
   */
  getMethod(elem, index, isCppBody) {
    if (elem.name.length > 0) {
      var docs = elem.documentation;
      var i;
      var methodStr = "";
      // var isVirtaul = false
      // TODO virtual fianl static 키워드는 섞어 쓸수가 없다
      if(elem.stereotype == "inline") methodStr += "inline ";

      if (elem.isStatic === true) {
        if(!isCppBody) methodStr += "static ";  // static method implementation doesn't require the keyword "static"
      } else if (elem.isAbstract === true) {
        methodStr += "virtual ";
      }

      var returnTypeParam = elem.parameters.filter(function (params) {
        return params.direction === "return";
      });
      var methodParams = elem.parameters.filter(function (params) {
        return params.direction === "in" || params.direction === "out" || params.direction === "inout";
      });
      var paramStrings = [];
      for (i = 0; i < methodParams.length; i++) {
        var param = methodParams[i];
        paramStrings.push((param.isReadOnly ? "const ": "") + this.getType(param) + " " + param.name);
        var direction = "";
        if(param.direction === "in") direction = "[in]";
        else if(param.direction === "out") direction = "[out]";
        else if(param.direction === "inout") direction = "[in, out]";
        docs += "\n@param" + direction + " " + param.name + " " + param.documentation;
      }

      if(returnTypeParam.length > 0 && !isCppBody) docs += "\n@return " + returnTypeParam[0].documentation;

      // If it's not a constructor/destructor (a constructor must have the same name of its class), add a return type
      if(elem.name != elem._parent.name.replace(/\s+/g, '')){
        if(returnTypeParam.length > 0) methodStr += (returnTypeParam[0].isReadOnly ? "const ": "");  // Add const if the return type is readOnly
        methodStr += (returnTypeParam.length > 0 ? this.getType(returnTypeParam[0]): "void") + " ";
      }
      
      if (isCppBody) {
        var telem = elem;
        var specifier = "";

        while (telem._parent instanceof type.UMLClass) {
          specifier = telem._parent.name.replace(/\s+/g, '') + "::" + specifier;
          telem = telem._parent;
        }

        var indentLine = "\t";
        
        methodStr += specifier;
        if(elem.stereotype == "destructor") methodStr += "~";
        methodStr += elem.name;
        methodStr += "(" + paramStrings.join(", ") + ")";
        if(elem.isQuery) methodStr += " const ";
        methodStr += "{\n";
        if (returnTypeParam.length > 0) {
          var returnType = this.getType(returnTypeParam[0]);

          // If option is enabled, generate the return statement too
          if(app.preferences.get("cpp.gen.generateReturnStatement")){
            if (returnType === "boolean" || returnType === "bool") {
              methodStr += indentLine + "return false;";
            } else if (
              returnType === "int" ||
              returnType === "int16_t" ||
              returnType === "size_t" ||
              returnType === "unsigned" ||
              returnType === "long" ||
              returnType === "short" ||
              returnType === "byte"
            ) {
              methodStr += indentLine + "return 0;";
            } else if (returnType === "double" || returnType === "float") {
              methodStr += indentLine + "return 0.0;";
            } else if (returnType === "char") {
              methodStr += indentLine + "return '0';";
            } else if (returnType === "string" || returnType === "String") {
              methodStr += indentLine + 'return "";';
            } else if(returnType.includes("*")) {   // check if it's of pointer type
              if(app.preferences.get("cpp.gen.useNULL")) methodStr += indentLine + "return NULL;";
              else methodStr += indentLine + "return nullptr;";
            }
            else methodStr += indentLine;   // for void & unrecognized types, just indent
          }
          
          docs += "\n@return " + returnTypeParam[0].documentation;
        }
        methodStr += "\n}";
      } else {
        if(elem.stereotype == "destructor") methodStr += "~";
        methodStr += elem.name;
        methodStr += "(" + paramStrings.join(", ") + ")";
        if (elem.isLeaf === true) {
          methodStr += " final";
        } else if (elem.isAbstract === true) {
          // TODO 만약 virtual 이면 모두 pure virtual? 체크 할것
          methodStr += " = 0";
        }

        if(elem.isQuery) methodStr += " const";
        methodStr += ";";
      }
      if (isCppBody) return "\n" + this.getDocuments(docs) + methodStr;
      else {
        var doc = this.getDocuments(docs).replace(/\n/g, '\n\t\t');
        if(doc != "") {
          if(index > 0) return "\n\t\t" + doc + methodStr;  // It adds a linebreak if the doc is included (to have a better generated code)
          else return doc + methodStr;
        }
        else return methodStr;
      }
    }
  }

  /**
   * generate doc string from doc element
   *
   * @param {Object} text
   * @return {Object} string
   */
  getDocuments(text) {
    if(!app.preferences.get("cpp.gen.genDoc")) return "";
    var docs = "";
    if (typeof text === "string" && text.length !== 0) {
      var lines = text.trim().split("\n");
      docs += "/**\n";
      var i;
      for (i = 0; i < lines.length; i++) {
        docs += "* " + lines[i] + "\n";
      }
      docs += "*/\n";
    }
    return docs;
  }

  // We need this for the header, because the getDocuments() check if the genDoc option is enabled.
  // TODO: remove getHeaderDocuments() and place app.preferences.get("cpp.gen.genDoc") outside the getDocuments().
  getHeaderDocuments(text) {
    var docs = "";
    if (typeof text === "string" && text.length !== 0) {
      var lines = text.trim().split("\n");
      docs += "/**\n";
      var i;
      for (i = 0; i < lines.length; i++) {
        docs += "* " + lines[i] + "\n";
      }
      docs += "*/\n";
    }
    return docs;
  }

  /**
   * parsing visibility from element
   *
   * @param {Object} elem
   * @return {Object} string
   */
  getVisibility(elem) {
    switch (elem.visibility) {
      case type.UMLModelElement.VK_PUBLIC:
        return "public";
      case type.UMLModelElement.VK_PROTECTED:
        return "protected";
      case type.UMLModelElement.VK_PRIVATE:
        return "private";
    }
    return null;
  }

  /**
   * parsing modifiers from element
   *
   * @param {Object} elem
   * @return {Object} list
   */
  getModifiers(elem) {
    var modifiers = [];
    if (elem.isStatic === true) {
      modifiers.push("static");
    }
    if (elem.isReadOnly === true) {
      modifiers.push("const");
    }
    if (elem.isAbstract === true) {
      modifiers.push("virtual");
    }
    return modifiers;
  }

  /**
   * parsing type from element
   *
   * @param {Object} elem
   * @return {Object} string
   */
  getType(elem) {
    var _type = "void";

    // If it's a UMLAssociationEnd
    if (elem instanceof type.UMLAssociationEnd) {
      // Use as type the class name for the member variable derived from the association
      if (elem.reference instanceof type.UMLModelElement && elem.reference.name.length > 0){
        _type = elem.reference.name.replace(/\s+/g, '');

        // If it's an aggregation or a simple association, add the "*" before the name type (it translates into a pointer)
        if(elem._parent.end2.aggregation != "composite") _type += "*";
      }
    } else {
      // member variable inside class
      if (
        elem.type instanceof type.UMLModelElement &&
        elem.type.name.length > 0
      ) {
        _type = elem.type.name;
      } else if (typeof elem.type === "string" && elem.type.length > 0) {
        _type = elem.type;
      }
    }

    // multiplicity
    if (elem.multiplicity) {
      if(["0..1"].includes(elem.multiplicity.trim())){
        // It the multiplicity is "0...1", it means optional partecipation.
        // So the optionality is implemented using a pointer.
        
        // This check avoid to add a double "*" if the association is an aggregation
        // because the "*" has been already added when checking for aggregation.
        if(!_type.includes('*')) _type += "*";
        return _type;
      }
      if (["0..*", "1..*", "*"].includes(elem.multiplicity.trim())) {
        if (elem.isOrdered === true) {
          _type = "vector<" + _type + ">";
        } else {
          _type = "vector<" + _type + ">";
        }
      }
      else if (
        elem.multiplicity !== "1" &&
        elem.multiplicity.match(/^\d+$/)
      ) {
        // number
        // TODO check here
        _type += "[]";
      }
    }
    return _type;
  }

  /**
   * get all super class / interface from element
   *
   * @param {Object} elem
   * @return {Object} list
   */
  getSuperClasses(elem) {
    var generalizations = app.repository.getRelationshipsOf(
      elem,
      function (rel) {
        return (
          (rel instanceof type.UMLGeneralization ||
            rel instanceof type.UMLInterfaceRealization) &&
          rel.source === elem
        );
      },
    );
    return generalizations;
  }
}

function generate(baseModel, basePath, options) {
  var cppCodeGenerator = new CppCodeGenerator(baseModel, basePath);
  cppCodeGenerator.generate(baseModel, basePath, options);
}

function getVersion() {
  return versionString;
}

exports.generate = generate;
exports.getVersion = getVersion;
