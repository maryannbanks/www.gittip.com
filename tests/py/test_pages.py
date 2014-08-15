from __future__ import print_function, unicode_literals

from gittip.security.user import SESSION
from gittip.testing import Harness


class TestPages(Harness):

    def test_homepage(self):
        actual = self.client.GET('/').body
        expected = "Weekly Payments"
        assert expected in actual

    def test_profile(self):
        self.make_participant('cheese', claimed_time='now')
        expected = "I'm grateful for gifts"
        actual = self.client.GET('/cheese/').body.decode('utf8') # deal with cent sign
        assert expected in actual

    def test_widget(self):
        self.make_participant('cheese', claimed_time='now')
        expected = "javascript: window.open"
        actual = self.client.GET('/cheese/widget.html').body
        assert expected in actual

    def test_bank_account(self):
        expected = "add<br> or change your bank account"
        actual = self.client.GET('/bank-account.html').body
        assert expected in actual

    def test_credit_card(self):
        expected = "add<br> or change your credit card"
        actual = self.client.GET('/credit-card.html').body
        assert expected in actual

    def test_github_associate(self):
        assert self.client.GxT('/on/github/associate').code == 400

    def test_twitter_associate(self):
        assert self.client.GxT('/on/twitter/associate').code == 400

    def test_about(self):
        expected = "small weekly cash gifts"
        actual = self.client.GET('/about/').body
        assert expected in actual

    def test_about_stats(self):
        expected = "have joined Gratipay"
        actual = self.client.GET('/about/stats.html').body
        assert expected in actual

    def test_about_charts(self):
        expected = "Money transferred"
        actual = self.client.GET('/about/charts.html').body
        assert expected in actual

    def test_about_faq(self):
        expected = "What is Gratipay?"
        actual = self.client.GET('/about/faq.html').body.decode('utf8')
        assert expected in actual

    def test_about_teams(self):
        expected = "About teams"
        actual = self.client.GET('/about/teams/').body.decode('utf8')
        assert expected in actual

    def test_404(self):
        response = self.client.GET('/about/four-oh-four.html', raise_immediately=False)
        assert "Page Not Found" in response.body
        assert "{%" not in response.body

    def test_bank_account_complete(self):
        assert self.client.GxT('/bank-account-complete.html').code == 404

    def test_for_contributors_redirects_to_building_gittip(self):
        assert self.client.GxT('/for/contributors/').headers['Location'] == \
                                                                      'http://building.gittip.com/'

    def test_mission_statement_also_redirects(self):
        assert self.client.GxT('/for/contributors/mission-statement.html').code == 302

    def test_bank_account_json(self):
        assert self.client.GxT('/bank-account.json').code == 404

    def test_credit_card_json(self):
        assert self.client.GxT('/credit-card.json').code == 404

    def test_anonymous_sign_out_redirects(self):
        response = self.client.PxST('/sign-out.html')
        assert response.code == 302
        assert response.headers['Location'] == '/'

    def test_sign_out_overwrites_session_cookie(self):
        self.make_participant('alice')
        response = self.client.PxST('/sign-out.html', auth_as='alice')
        assert response.code == 302
        assert response.headers.cookie[SESSION].value == ''

    def test_receipts_signed_in(self):
        self.make_participant('alice', claimed_time='now')
        self.db.run("INSERT INTO exchanges (id, participant, amount, fee) "
                    "VALUES(100,'alice',1,0.1)")
        request = self.client.GET("/alice/receipts/100.html", auth_as="alice")
        assert request.code == 200
