<?php
// $Id$

/**
 * @file
 * Implementation of module administration pages.
 */

/**
 * Build the module settings form.
 */
function dirtyforms_admin_settings() {
  $form = array();
  $settings = _dirtyforms_get_settings();
  $form['form_id_filters'] = array(
    '#type' => 'fieldset',
    '#title' => t('Form ID Filters'),
    '#collapsible' => FALSE,
    '#description' => t('These options allow you to configure which forms should be processed or excluded from the dirtyForms behavior.'),
  );
  $form['form_id_filters']['dirtyforms_forms_policy'] = array(
    '#type' => 'radios',
    '#title' => t('Policy'),
    '#options' => array(
      'disabled' => t('Disabled - Do not process any form.'),
      'whitelist' => t('Whitelist - Process only the forms matching the rules specified below.'),
      'blacklist' => t('Blacklist - Process all forms, except those matching the rules specified below.'),
    ),
    '#default_value' => $settings['forms']['policy'],
  );
  $form['form_id_filters']['dirtyforms_forms_rules'] = array(
    '#type' => 'textarea',
    '#title' => t('Form ID Rules'),
    '#default_value' => implode(",\n", $settings['forms']['rules']),
    '#cols' => 60,
    '#rows' => min(20, max(10, count($settings['forms']['rules']) + 2)),
    '#description' => t('Enter a comma separated list of expressions to match against Form IDs. Each expression may contain any number of alphanumeric characters (a-z0-9), hiphens (-), underscores (_) or the asterisk wildcard character (*).'),
  );
  $form['troubleshooting'] = array(
    '#type' => 'fieldset',
    '#title' => t('Troubleshooting'),
    '#collapsible' => TRUE,
    '#collapsed' => !$settings['troubleshooting']['alerts'],
    '#description' => t('Options for helping track issues with the client-side code.'),
  );
  $form['troubleshooting']['dirtyforms_troubleshooting_alerts'] = array(
    '#type' => 'checkbox',
    '#title' => t('Enable javascript alerts'),
    '#default_value' => $settings['troubleshooting']['alerts'],
    '#description' => t('When this option is enabled, an alert will tell you additional information about the element that caused the onBeforeUnload dialog to appear.'),
  );
  $form = system_settings_form($form);
  if (!isset($form['#validate'])) {
    $form['#validate'] = array();
  }
  array_unshift($form['#validate'], 'dirtyforms_admin_settings_validate');
  return $form;
}

/**
 * Validate handler for the module settings form.
 */
function dirtyforms_admin_settings_validate($form, &$form_state) {
  $forms_rules = preg_replace('`\s`', '', $form_state['values']['dirtyforms_forms_rules']);
  $forms_rules = array_filter(array_map('trim', explode(',', $forms_rules)));
  $error = FALSE;
  foreach ($forms_rules as $rule) {
    if (!preg_match('`^[-a-z0-9_*]*$`', $rule)) {
      form_set_error('dirtyforms_forms_rules', t('Invalid characters in rule: %rule', array('%rule' => $rule)));
      $error = TRUE;
    }
  }
  if (!$error) {
    $form_state['values']['dirtyforms_forms_rules'] = $forms_rules;
  }
}
