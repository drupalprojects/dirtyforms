// $Id$

/**
 * @file
 * Check forms before users leave the page, warning them if they are about
 * to loose changes and providing an option to remain on the page.
 *
 * The following element types are processed (unless they are excluded):
 * - Form elements of type text, password, textarea, select, radio, checkbox
 *   and hidden.
 *
 * The following elements are excluded from processing:
 * - Forms and form elements that have the CSS class 'dirtyforms-exclude'.
 * - Forms with no id attribute.
 * - Form elements with no name attribute, because are considered client-side
 *   elements (ie. these elements are not sent to the server).
 * - Form elements of type submit, button, reset, image and file.
 *
 * Forms and form elements added or removed dynamically, if not excluded by any
 * of the above mentioned rules, are considered dirty.
 *
 * @TODO: Rebuild the state of saved forms that are submitted dynamically, or
 * explore how ajax forms are affected and/or affect dirty state checking.
 */

/**
 * Install the Drupal behavior.
 */
Drupal.behaviors.dirtyForms = function(context) {
  if (!Drupal.onBeforeUnload.callbackExists('dirtyforms')) {
    // Install our onBeforeUnload callback.
    Drupal.onBeforeUnload.addCallback('dirtyforms', Drupal.dirtyForms._onBeforeUnload);

    // Save state of all non-excluded forms in the document.
    Drupal.dirtyForms.saveState(context);
  }
};

/**
 * Create dirtyForms object.
 *
 * Private properties and methods are prefixed with an underscore.
 */
Drupal.dirtyForms = Drupal.dirtyForms || {
  warning: Drupal.t('Your changes will be lost if you leave this page now.'),
  isSubmitted: false,
  _excludedElementTypes: ['submit', 'button', 'reset', 'image', 'file'],
  _savedElements: {},
  _WYSIWYG: {}
};

/**
 * Save the state of the given form.
 */
Drupal.dirtyForms.isDirty = function() {
  var currentForms = this._getForms();

  for (var formId in currentForms) {
    // Check whether this form was present when state was saved.
    if (this._savedElements[formId] == undefined) {
      //alert('The form "'+ formId +'" was not processed initially.');
      return true;
    }
  }

  for (var formId in this._savedElements) {
    // Check whether this form is not present in the document.
    if (currentForms[formId] == undefined) {
      //alert('Could not find processed form "'+ formId +'"');
      return true;
    }

    // Now let's compare element values.
    var currentElements = this._getElements(currentForms[formId]);
    var savedElements = this._savedElements[formId];
    //alert('currentElements['+ formId +']: "'+ currentElements.toSource());
    //alert('savedElements['+ formId +']: "'+ savedElements.toSource());
    for (var elementId in savedElements) {
      // Check whether a saved element still exists in the form.
      if (!currentElements.hasOwnProperty(elementId)) {
        //alert('Could not find the element "'+ elementId +'" in the form "'+ formId +'"');
        return true;
      }
      // Check whether the value of the element has been changed.
      if (this._isElementChanged(currentElements[elementId], savedElements[elementId])) {
        //alert('The element "'+ elementId +'" in the form "'+ formId +'" has been changed.\n\nSaved value: '+ savedElements[elementId].toString() +'\nCurrent value: '+ currentElements[elementId].toString());
        return true;
      }
    }

    for (var elementId in currentElements) {
      // Check whether a new element was not present in the original form.
      if (!savedElements.hasOwnProperty(elementId)) {
        //alert('The element "'+ elementId +'" in the form "'+ formId +'" was not processed initially.');
        return true;
      }
    }
  }
  return false;
};

/**
 * Save state of all non-excluded forms in the given context.
 */
Drupal.dirtyForms.saveState = function(context) {
  var forms = this._getForms(context);
  for (var formId in forms) {
    this.addForm(forms[formId]);
  }
};

/**
 * Clear the state of all processed forms in the given context.
 */
Drupal.dirtyForms.clearState = function(context) {
  var forms = this._getForms(context);
  for (var formId in forms) {
    this.removeForm(forms[formId]);
  }
  this._savedElements = {};
};

/**
 * Add a form to the dirtyForms collection.
 */
Drupal.dirtyForms.addForm = function(form) {
  var formId = form.id;

  // Attach a dirtyForms object to the form (if not already present).
  if (form._dirtyForms == undefined) {
    form._dirtyForms = {

      // Save the previous onSubmit handler of the form.
      previousOnSubmit: form.onsubmit,

      // This attribute allows us to identify the form in the future.
      formId: formId
    };

    // Bind our onSubmit handler to the form.
    form.onsubmit = Drupal.dirtyForms._onSubmit;
  }

  // Add or replace the form to the savedElements collection.
  this._savedElements[formId] = this._getElements(form);
};

/**
 * Remove a form from the dirtyForms collection.
 */
Drupal.dirtyForms.removeForm = function(form) {
  // Ignore unprocessed forms.
  if (typeof form._dirtyForms == 'object') {
    var formId = form._dirtyForms.formId;

    if (typeof this._savedElements[formId] == 'object') {
      // Destroy the savedElements collection for this form.
      delete this._savedElements[formId];

      // Restore the previous onSubmit handler of the form.
      form.onsubmit = form._dirtyForms.previousOnSubmit;

      // Destroy the dirtyForms object on the form.
      delete form._dirtyForms;
    }
  }
};

/**
 * onBeforeUnload callback.
 */
Drupal.dirtyForms._onBeforeUnload = function() {
  var self = Drupal.dirtyForms;
  if (!self.isSubmitted && self.isDirty()) {
    return self.warning;
  }
};

/**
 * onSubmit handler for processed forms.
 */
Drupal.dirtyForms._onSubmit = function(event) {
  Drupal.dirtyForms.isSubmitted = true;
  if (typeof this._dirtyForms.previousOnSubmit == 'function') {
    return this._dirtyForms.previousOnSubmit(event);
  }
  return true;
};

/**
 * Get a list of forms in the given context.
 */
Drupal.dirtyForms._getForms = function(context) {
  var forms = {};
  context = context || document;

  $('form:not(.dirtyforms-exclude)', context).each(function() {
    var form = this;

    // All Drupal forms should have an ID, so exclude those that do not.
    if (typeof form.id == 'string' && form.id.length > 0) {
      forms[form.id] = form;
    }
  });
  return forms;
};

/**
 * Get a list of form elements and their values.
 */
Drupal.dirtyForms._getElements = function(form) {
  var elements = {};
  for (var i = 0; i < form.elements.length; i++) {
    var element = form.elements[i];

    // Exclude nameless elements (considered client-side only).
    if (typeof element.name != 'string' || element.name.length <= 0) {
      continue;
    }

    // Also, exclude elements that do not have an ID.
    if (typeof element.id != 'string' || element.id.length <= 0) {
      continue;
    }

    // Exclude certain types of form elements.
    if ($.inArray(element.type, this._excludedElementTypes) >= 0) {
      continue;
    }

    // Exclude elements by CSS class.
    if ($(element).hasClass('dirtyforms-exclude')) {
      continue;
    }

    elements[element.id] = {
      id: element.id,
      name: element.name,
      type: element.type,
      value: this._getElementValue(element)
    };
  }
  return elements;
};

/**
 * Get the value of a form element.
 */
Drupal.dirtyForms._getElementValue = function(element) {
  if (element.type == 'checkbox') {
    return (element.checked ? element.value : null);
  }
  if (element.type == 'radio') {
    var radio = element.form.elements[element.name];
    for (var i = 0; i < radio.length; i++) {
      if (radio[i].checked) {
        return radio[i].value;
      }
    }
    return null;
  }
  return element.value;
};

/**
 * Compare an element against its saved version.
 */
Drupal.dirtyForms._isElementChanged = function(currentElement, savedElement) {
  if (currentElement.value != savedElement.value) {
    // Perform special processing for WYSIWYG Textareas.
    var editorInfo;
    if ((editorInfo = this._WYSIWYG.isEditor(currentElement)) && !this._WYSIWYG.isDirty(editorInfo)) {
      return false;
    }
    return true;
  }
  return false;
};

/**
 * Find out if the element is a WYSIWYG Textarea.
 *
 * @todo: Add support for more editors. Please, give me links to APIs. Thanks! ;-)
 *
 * @link http://wiki.moxiecode.com/index.php/TinyMCE:API/tinymce.EditorManager/get
 * @link http://wiki.moxiecode.com/index.php/TinyMCE:API/tinymce.Editor
 * @link http://docs.fckeditor.net/FCKeditor_2.x/Developers_Guide/JavaScript_API
 * @link http://developer.yahoo.com/yui/docs/YAHOO.widget.EditorInfo.html
 * @link http://developer.yahoo.com/yui/docs/YAHOO.widget.SimpleEditor.html
 */
Drupal.dirtyForms._WYSIWYG.isEditor = function(element) {
  var editor;
  if (element.type != 'textarea') {
    return false;
  }
  if (typeof tinyMCE == 'object' && typeof tinyMCE.get == 'function') {
    if ((editor = tinyMCE.get(element.id)) && editor.isDirty) {
      return {type: 'TinyMCE', editor: editor, element: element};
    }
  }
  if (typeof FCKeditorAPI == 'object' && typeof FCKeditorAPI.GetInstance == 'function') {
    if ((editor = FCKeditorAPI.GetInstance(element.id)) && editor.isDirty) {
      return {type: 'FCKeditor', editor: editor, element: element};
    }
  }
  if (YAHOO && YAHOO.widget && YAHOO.widget.EditorInfo && YAHOO.widget.EditorInfo.getEditorById) {
    if (editor = YAHOO.widget.EditorInfo.getEditorById(element.id)) {
      return {type: 'yui', editor: editor, element: element};
    }
  }
  return false;
};

/**
 * Find out if a WYSIWYG Textarea has been modified.
 */
Drupal.dirtyForms._WYSIWYG.isDirty = function(editorInfo) {
  if ($.inArray(editorInfo.type, ['TinyMCE', 'FCKeditor'])) {
    // Same interface for both editors.
    if (editorInfo.editor.isDirty()) {
      return true;
    }
  }
  else if (editorInfo.type == 'yui') {
    if (editorInfo.editor.editorDirty) {
      return true;
    }
  }
  return false;
};
