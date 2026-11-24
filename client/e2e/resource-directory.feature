Feature: Campus resource directory
  As a student, I want to filter the directory so I can find a study room.

  Scenario: Find study rooms in the directory
    Given I am viewing the directory with a library study room and a media camera kit
    When I select Study rooms
    Then I see the library study room
    And the media camera kit is hidden
