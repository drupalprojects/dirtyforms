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
  $form['form_id_filters']['dirtyforms_form_ids_policy'] = array(
    '#type' => 'radios',
    '#title' => t('Policy'),
    '#options' => array(
      'disabled' => t('Disabled - Do not process any form.'),
      'whitelist' => t('Whitelist - Process only the forms matching the rules specified below.'),
      'blacklist' => t('Blacklist - Process all forms, except those matching the rules specified below.'),
    ),
    '#default_value' => $settings['form_ids_policy'],
    '#description' => t('If you choose the whitelist option, be sure to add your own domain names to the list!'),
  );
  $form['form_id_filters']['dirtyforms_form_ids_rules'] = array(
    '#type' => 'textarea',
    '#title' => t('Form ID Rules'),
    '#default_value' => implode(",\n", $settings['form_ids_rules']),
    '#cols' => 60,
    '#rows' => min(20, max(10, count($settings['form_ids_rules']) + 2)),
    '#description' => t('Enter a comma separated list of expressions to match against Form IDs. Each expression may contain any number of alphanumeric characters (a-z0-9), hiphens (-), underscores (_) or the asterisk wildcard character (*).'),
  );
  $form = system_settings_form($form);
  if (!isset($form['#validate'])) {
    $form['#validate'] = array();
  }
  array_unshift($form['#validate'], 'dirtyforms_admin_settings_validate');
  if (!isset($form['#submit'])) {
    $form['#submit'] = array();
  }
  array_unshift($form['#submit'], 'dirtyforms_admin_settings_submit');
  return $form;
}

/**
 * Validate handler for the module settings form.
 */
function dirtyforms_admin_settings_validate($form, &$form_state) {
  $form_id_rules = preg_replace('`\s`', '', $form_state['values']['dirtyforms_form_ids_rules']);
  $form_id_rules = array_filter(array_map('trim', explode(',', $form_id_rules)));
  $error = FALSE;
  foreach ($form_id_rules as $rule) {
    if (!preg_match('`^[-a-z0-9_*]*$`', $rule)) {
      form_set_error('dirtyforms_form_ids_rules', t('Invalid characters in rule: %rule', array('%rule' => $rule)));
      $error = FALSE;
    }
  }
  if (!$error) {
    $form_state['values']['dirtyforms_form_ids_rules'] = $form_id_rules;
  }
}
