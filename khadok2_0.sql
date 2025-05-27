-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 24, 2025 at 09:56 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `khadok2.0`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `admin_id` int(10) NOT NULL,
  `name` varchar(20) NOT NULL,
  `email` varchar(20) NOT NULL,
  `password` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cart`
--

CREATE TABLE `cart` (
  `cart_id` int(10) NOT NULL,
  `consumer_id` int(10) NOT NULL,
  `menu_id` int(10) NOT NULL,
  `quatity` int(5) NOT NULL,
  `stakeholder_id` int(10) NOT NULL,
  `item_name` varchar(20) NOT NULL,
  `item_price` int(10) NOT NULL,
  `item_picture` varchar(255) DEFAULT NULL,
  `added_at` date DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `consumer`
--

CREATE TABLE `consumer` (
  `consumer_id` int(10) NOT NULL,
  `name` varchar(20) NOT NULL,
  `email` varchar(20) NOT NULL,
  `password` varchar(50) NOT NULL,
  `number` varchar(11) DEFAULT NULL,
  `flag` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `address` varchar(255) DEFAULT NULL,
  `age` int(3) DEFAULT NULL,
  `gender` varchar(10) NOT NULL,
  `picture` varchar(255) NOT NULL,
  `lat` varchar(20) NOT NULL,
  `lng` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `consumer`
--

INSERT INTO `consumer` (`consumer_id`, `name`, `email`, `password`, `number`, `flag`, `created_at`, `updated_at`, `address`, `age`, `gender`, `picture`, `lat`, `lng`) VALUES
(35, 'Sadik Mahmud', 'sadik@gmail.com', '', '01937890430', 1, '2025-05-07 21:16:48', '2025-05-19 12:58:46', 'Shonir Akhra - Mridhabari Road, Mridhabari, Shonir Akhra, Dhaka, Dhaka Metropolitan, Dhaka District, Dhaka Division, 1236, Bangladesh', 24, 'male', 'consumer_1747637926703.jpg', '23.703512', '90.450709');

-- --------------------------------------------------------

--
-- Table structure for table `cuisine`
--

CREATE TABLE `cuisine` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cuisine`
--

INSERT INTO `cuisine` (`id`, `name`) VALUES
(41, 'Appetizer'),
(1, 'Asian'),
(2, 'Bakery'),
(3, 'Bangladeshi'),
(4, 'Beverage'),
(5, 'Biryani'),
(6, 'Burgers'),
(7, 'Cafe'),
(8, 'Cakes'),
(9, 'Chicken'),
(10, 'Chinese'),
(40, 'Chotpoti & Fuchka'),
(11, 'Curry'),
(12, 'Dessert'),
(13, 'Dumpling'),
(14, 'Fast Food'),
(15, 'Fish'),
(16, 'Fried Chicken'),
(42, 'Grill'),
(17, 'Indian'),
(18, 'Italian'),
(19, 'Japanese'),
(20, 'Juice Corner'),
(21, 'Kebab'),
(22, 'Korean'),
(23, 'Meat'),
(24, 'Mediterranean'),
(25, 'Middle Eastern'),
(45, 'Momos'),
(46, 'Nachos'),
(26, 'Noodles'),
(27, 'Pasta'),
(28, 'Pizza'),
(29, 'Rice Dishes'),
(30, 'Sandwiches'),
(31, 'Seafood'),
(47, 'Set Menu'),
(32, 'Shawarma'),
(43, 'Sides'),
(33, 'Snacks'),
(34, 'Soups'),
(35, 'Sweets'),
(44, 'Taco'),
(36, 'Thai'),
(37, 'Turkish'),
(38, 'Vegetarian'),
(39, 'Western');

-- --------------------------------------------------------

--
-- Table structure for table `delivery`
--

CREATE TABLE `delivery` (
  `delivery_id` int(10) NOT NULL,
  `consumer_id` int(10) NOT NULL,
  `rider_id` int(10) NOT NULL,
  `delivery_date` datetime NOT NULL DEFAULT current_timestamp(),
  `status` varchar(10) NOT NULL DEFAULT 'pending',
  `total_amount` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dine_in`
--

CREATE TABLE `dine_in` (
  `dine_in_id` int(10) NOT NULL,
  `consumer_id` int(10) NOT NULL,
  `stakeholder_id` int(10) NOT NULL,
  `table_size` int(2) NOT NULL,
  `quantity` int(5) NOT NULL,
  `booking_time` datetime NOT NULL DEFAULT current_timestamp(),
  `status` varchar(10) NOT NULL DEFAULT 'pending',
  `message` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `interior`
--

CREATE TABLE `interior` (
  `interior_id` int(10) NOT NULL,
  `stakeholder_id` int(10) DEFAULT NULL,
  `table_type` enum('2','4','8','16','5') DEFAULT NULL,
  `availability` int(10) DEFAULT 1,
  `bookable` int(10) DEFAULT NULL,
  `picture` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `interior_pic`
--

CREATE TABLE `interior_pic` (
  `pic_id` int(10) NOT NULL,
  `stakeholder_id` int(10) NOT NULL,
  `pic` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `menu`
--

CREATE TABLE `menu` (
  `menu_id` int(10) NOT NULL,
  `stakeholder_id` int(10) NOT NULL,
  `item_name` varchar(20) NOT NULL,
  `category` varchar(20) DEFAULT NULL,
  `item_price` int(10) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `item_picture` varchar(255) DEFAULT NULL,
  `rating` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu`
--

INSERT INTO `menu` (`menu_id`, `stakeholder_id`, `item_name`, `category`, `item_price`, `description`, `item_picture`, `rating`) VALUES
(9, 36, 'Chicken Chaap', NULL, 160, '1:1- Prepared with special masala & spices', 'upload_1748116438622.jpg', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(10) NOT NULL,
  `stakeholder_id` int(10) NOT NULL,
  `menu_id` int(10) NOT NULL,
  `consumer_id` int(10) NOT NULL,
  `order_date` datetime NOT NULL DEFAULT current_timestamp(),
  `status` varchar(10) NOT NULL DEFAULT 'pending',
  `total_amount` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pickup`
--

CREATE TABLE `pickup` (
  `pickup_id` int(10) NOT NULL,
  `consumer_id` int(10) NOT NULL,
  `stakeholder_id` int(10) NOT NULL,
  `pickup_date` datetime NOT NULL DEFAULT current_timestamp(),
  `status` varchar(10) NOT NULL DEFAULT 'pending',
  `total_amount` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `review`
--

CREATE TABLE `review` (
  `review_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `stakeholder_id` int(11) NOT NULL,
  `consumer_id` int(11) NOT NULL,
  `rating` float NOT NULL,
  `review_text` varchar(100) DEFAULT NULL,
  `review_date` datetime DEFAULT current_timestamp(),
  `review_pic` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rider`
--

CREATE TABLE `rider` (
  `rider_id` int(10) NOT NULL,
  `name` varchar(20) NOT NULL,
  `email` varchar(20) NOT NULL,
  `password` varchar(50) NOT NULL,
  `number` varchar(11) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `starts_at` time NOT NULL,
  `ends_at` time NOT NULL,
  `lat` varchar(20) NOT NULL,
  `lng` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('xHn0o784VtNb3A-oXbJ_FyEtsjTosUcs', 1748115249, '{\"cookie\":{\"originalMaxAge\":1800000,\"expires\":\"2025-05-24T19:09:01.165Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":36,\"role\":\"stakeholder\"}');

-- --------------------------------------------------------

--
-- Table structure for table `stakeholder`
--

CREATE TABLE `stakeholder` (
  `stakeholder_id` int(10) NOT NULL,
  `name` varchar(20) DEFAULT NULL,
  `email` varchar(20) NOT NULL,
  `password` varchar(50) NOT NULL,
  `restaurant_name` varchar(20) DEFAULT NULL,
  `ratings` float DEFAULT NULL,
  `address` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `type` varchar(50) DEFAULT NULL,
  `opens_at` time DEFAULT NULL,
  `closes_at` time DEFAULT NULL,
  `lat` varchar(20) NOT NULL,
  `lng` varchar(20) NOT NULL,
  `number` varchar(11) DEFAULT NULL,
  `picture` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stakeholder`
--

INSERT INTO `stakeholder` (`stakeholder_id`, `name`, `email`, `password`, `restaurant_name`, `ratings`, `address`, `created_at`, `updated_at`, `type`, `opens_at`, `closes_at`, `lat`, `lng`, `number`, `picture`) VALUES
(36, 'sorol', 'sorol@gmail.com', '', 'Chillzzz', NULL, 'Shonir Akhra - Mridhabari Road, Mridhabari, Shonir Akhra, Dhaka, Dhaka Metropolitan, Dhaka District,', '2025-05-07 21:37:53', '2025-05-22 23:12:38', '[\"delivery\",\"pickup\",\"dine-in\"]', '16:00:00', '23:00:00', '23.703102', '90.450842', '01937890430', 'consumer_1747933958335.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `stakeholder_cuisine`
--

CREATE TABLE `stakeholder_cuisine` (
  `stakeholder_id` int(11) NOT NULL,
  `cuisine_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stakeholder_cuisine`
--

INSERT INTO `stakeholder_cuisine` (`stakeholder_id`, `cuisine_id`, `menu_id`) VALUES
(36, 21, 9);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(10) NOT NULL,
  `name` varchar(20) NOT NULL,
  `email` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password`, `role`, `created_at`, `updated_at`) VALUES
(35, 'sadik', 'sadik@gmail.com', '$2b$10$azOHyespnPUjUKCq/deWLeqxPbZCJz79kZYmctVcliGlwXb6E2l6u', 'consumer', '2025-05-07 21:16:48', '2025-05-07 21:16:48'),
(36, 'sorol', 'sorol@gmail.com', '$2b$10$XvoAFz75/.yLv0ej0qG4ie6R51zM7tXJ5n8ZJZk5utDC1E/Ammm3i', 'stakeholder', '2025-05-07 21:37:53', '2025-05-07 21:37:53');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`admin_id`);

--
-- Indexes for table `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`cart_id`);

--
-- Indexes for table `consumer`
--
ALTER TABLE `consumer`
  ADD PRIMARY KEY (`consumer_id`);

--
-- Indexes for table `cuisine`
--
ALTER TABLE `cuisine`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `delivery`
--
ALTER TABLE `delivery`
  ADD PRIMARY KEY (`delivery_id`);

--
-- Indexes for table `dine_in`
--
ALTER TABLE `dine_in`
  ADD PRIMARY KEY (`dine_in_id`);

--
-- Indexes for table `interior`
--
ALTER TABLE `interior`
  ADD PRIMARY KEY (`interior_id`);

--
-- Indexes for table `interior_pic`
--
ALTER TABLE `interior_pic`
  ADD PRIMARY KEY (`pic_id`);

--
-- Indexes for table `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`menu_id`);

--
-- Indexes for table `pickup`
--
ALTER TABLE `pickup`
  ADD PRIMARY KEY (`pickup_id`);

--
-- Indexes for table `rider`
--
ALTER TABLE `rider`
  ADD PRIMARY KEY (`rider_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `expires` (`expires`);

--
-- Indexes for table `stakeholder`
--
ALTER TABLE `stakeholder`
  ADD PRIMARY KEY (`stakeholder_id`);

--
-- Indexes for table `stakeholder_cuisine`
--
ALTER TABLE `stakeholder_cuisine`
  ADD PRIMARY KEY (`menu_id`),
  ADD KEY `stakeholder_cuisine_ibfk_2` (`cuisine_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `unique_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `admin_id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cart`
--
ALTER TABLE `cart`
  MODIFY `cart_id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `consumer`
--
ALTER TABLE `consumer`
  MODIFY `consumer_id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `cuisine`
--
ALTER TABLE `cuisine`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `delivery`
--
ALTER TABLE `delivery`
  MODIFY `delivery_id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dine_in`
--
ALTER TABLE `dine_in`
  MODIFY `dine_in_id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `interior`
--
ALTER TABLE `interior`
  MODIFY `interior_id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `interior_pic`
--
ALTER TABLE `interior_pic`
  MODIFY `pic_id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `menu`
--
ALTER TABLE `menu`
  MODIFY `menu_id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `pickup`
--
ALTER TABLE `pickup`
  MODIFY `pickup_id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rider`
--
ALTER TABLE `rider`
  MODIFY `rider_id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `stakeholder`
--
ALTER TABLE `stakeholder`
  MODIFY `stakeholder_id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `stakeholder_cuisine`
--
ALTER TABLE `stakeholder_cuisine`
  ADD CONSTRAINT `stakeholder_cuisine_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`menu_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `stakeholder_cuisine_ibfk_2` FOREIGN KEY (`cuisine_id`) REFERENCES `cuisine` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
