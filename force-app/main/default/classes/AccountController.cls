public with sharing class AccountController {
    @RemoteAction
    public static List<Account> getAccounts() {
        return [SELECT Id, Name From Account LIMIT 100];
    }
}
