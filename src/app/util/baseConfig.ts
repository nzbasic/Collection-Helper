import { DefaultConfig } from "ngx-easy-table";

let configuration = { ...DefaultConfig };
configuration.isLoading = true;
configuration.checkboxes = true;
configuration.selectRow = true;
configuration.clickEvent = true;
configuration.paginationEnabled = false;
configuration.paginationRangeEnabled = false;

export default configuration;
