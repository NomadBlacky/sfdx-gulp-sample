@isTest
public with sharing class AccountControllerTest {

    @testSetup
    static void setup() {
        List<Account> accounts = new Account[] {
            new Account(Name = 'acc01'),
            new Account(Name = 'acc02')
        };
        insert accounts;
    }

    @isTest
    static void testGetAccounts() {
        List<Account> expect = [SELECT Id, Name FROM Account];
        List<Account> actual = AccountController.getAccounts();

        System.assertEquals(expect, actual);
    }
}
