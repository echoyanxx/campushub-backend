Feature: Campus Resource Reservation Engine
  As a student, I want to request a campus resource for a specific time
  so I can plan my work around its availability.

  Scenario: Student successfully requests an available study room
    Given a registered student has set their student ID on the CampusHub home page
    And "Study Room 302" is listed as available with no active reservation tomorrow from "10:00 AM" to "11:00 AM"
    When the student filters the directory using "Study rooms"
    And selects "Study Room 302"
    And requests a booking for tomorrow from "10:00 AM" to "11:00 AM"
    Then the booking form displays "Booking requested. Your reservation is pending confirmation."
    And "My Bookings" shows the room and requested time with status "Pending"

  Scenario: Student receives a conflict alert when a resource is already reserved
    Given "3D Printer A" is displayed as available in the resource directory
    And it already has an active reservation tomorrow from "2:00 PM" to "3:00 PM"
    And a different registered student with no bookings has set their student ID on the CampusHub home page
    When the student filters the directory using "Equipment"
    And selects "3D Printer A"
    And requests a booking for tomorrow from "2:00 PM" to "3:00 PM"
    Then the booking form displays "This resource is already booked for that time. Choose a different time and try again."
    And no reservation for that time is created for the requesting student
    And their "My Bookings" list has no reservation for that slot after refreshing
