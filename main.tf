provider "aws"{
region = "string"
profile = "default"
}

resource "aws_instance" "my_ec2_instance"{
ami = "string"
instance_type = "string"
key_name = "2024key"
tags = {
Name = "string"
}
}

resource "aws_s3_bucket" "my_s3_bucket"{
bucket = "string"
}

resource "aws_s3_bucket_policy" "private_policy"{
bucket = "string"
policy = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PrivateContent\",\"Effect\":\"Deny\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::string/*\"}]}"
}

