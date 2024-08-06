provider "aws"{
region = "ca-central-1"
profile = "default"
}

resource "aws_instance" "my_ec2_instance"{
ami = "ami-07117708253546063"
instance_type = "t2.micro"
key_name = "2024key"
tags = {
Name = "ikbel"
}
}

