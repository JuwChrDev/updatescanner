import time
import pytest
from hamcrest import assert_that, is_

from matchers import eventually_visible
from regions import sidebar, content


@pytest.mark.usefixtures("firefox")
class TestSidebar:
    def test_sidebar_is_open_after_addon_install(self):
        time.sleep(0.5)
        assert_that(sidebar.title, is_(eventually_visible()))

    def test_clicking_an_item_opens_it(self):
        time.sleep(1)
        sidebar.updatescanner_website_item.click()

        assert_that(
            content.updatescanner_website_page, is_(eventually_visible()))
