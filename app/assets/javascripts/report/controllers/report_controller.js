// ELMO.Report.ReportController
(function(ns, klass) {
  
  // constructor
  ns.ReportController = klass = function(init_data) {
    // create supporting models
    this.options = init_data.options;
    this.menus = {
      attrib: new ns.AttribMenu(this.options.attribs),
      form: new ns.FormMenu(this.options.forms),
      calc_type: new ns.CalcTypeMenu(this.options.calculation_types),
      question: new ns.QuestionMenu(this.options.questions),
      option_set: new ns.OptionSetMenu(this.options.option_sets)
    }

    this.report_in_db = new ns.Report(init_data.report, this.menus);
    this.report_in_db.prepare();
    
    // create copy of report to be referenced each run
    this.report_last_run = this.report_in_db.clone();
    
    // create report view
    this.report_view = new ns.ReportView(this, this.report_in_db);
    
    // create edit view
    this.edit_view = new ns.EditView(this.menus, this.options, this);
    
    // update the links
    this.edit_view.show_hide_edit_links(this.report_in_db);
        
    // otherwise, if is new record, show dialog first page
    if (!this.report_in_db.has_run())
      this.show_edit_view(0);
      
    // otherwise, the report must have already run, so update the view
    else
      this.display_report(this.report_last_run);
  }

  klass.prototype.show_edit_view = function(idx) {
    $("#report_links, #report_main").hide();
    this.edit_view.show(this.report_last_run.clone(), idx);
  }
  
  // sends an ajax request to server
  klass.prototype.run_report = function(report) {
    this.report_view.show_loading_indicator(true);
    
    // get hash from report
    var to_serialize = {}
    to_serialize["report"] = report.to_hash();
    if (report.attribs.id) to_serialize["id"] = report.attribs.id;
  
    // comply with REST stuff
    to_serialize["_method"] = report.attribs.new_record ? "post" : "put"
    var url = Utils.build_url("report", "reports", report.attribs.new_record ? "" : report.attribs.id);
  
    // send ajax (use currying for event handlers)
    (function(_this) {
      Utils.ajax_with_session_timeout_check({
        type: 'POST',
        url: url,
        data: $.param(to_serialize),
        success: function(d, s, j) { _this.run_success(d, s, j); },
        error: function(j, s, e) { _this.run_error(j, s, e); }
      })
    })(this);
  }
  
  klass.prototype.run_success = function(data, status, jqxhr) {
    
    // if the 'just created' flag is set, redirect to the show action so that links, etc., will work
    if (data.report.just_created) {
      this.report_view.show_loading_indicator(true);
      window.location.href = Utils.build_url("report", "reports", data.report.id)
      
    // otherwise we can process the updated report object
    } else {
      this.restore_view();
      this.report_last_run = new ns.Report(data.report, this.menus);
      this.report_last_run.prepare();
      this.display_report(this.report_last_run);
    }
  }
  
  klass.prototype.run_error = function(jqxhr, status, error) {
    this.restore_view();  
    // show error
    var msg = I18n.t("layout." + (error == "" ? "server_contact_error" : "system_error"));
    this.report_view.show_error(msg);
  }
  
  klass.prototype.edit_cancelled = function() {
    // if report is new, go back to report index
    if (!this.report_in_db.has_run()) {
      this.report_view.show_loading_indicator(true);
      window.location.href = Utils.build_url("report/reports");
    // else restore the view
    } else
      this.restore_view();
  }
  
  klass.prototype.display_report = function(report) {
    // update the report view
    this.report_view.update(report);
    
    // show/hide the export link if there is no data or an error
    $("a#csv_link")[report.no_data() || report.has_errors() ? "hide" : "show"]();
  }
  
  klass.prototype.restore_view = function() {
    // hide load ind
    this.report_view.show_loading_indicator(false);
    // show links and body
    $("#report_links, #report_main").show();
  }
  
}(ELMO.Report));